'use strict'

var ServiceSync = require('./service.gen.sync');
var request = require('request');
var fs = require('fs');
var hoek = require('hoek');

var internals = {};

internals.Service = function(servJson, host) {
	if (host === undefined) {
		throw new Error('Missing host when trying to create services...');
	}
	this.proxy = undefined;
	this.host = host;
	this.debug = undefined;
	this.writeStream = undefined;

	if (process.env.BLUECAT_DEBUG_FILE) {
		this.writeStream = fs.createWriteStream(process.env.BLUECAT_DEBUG_FILE, {
			flags: 'a'
		});
	} else if (process.env.BLUECAT_DEBUG_CONSOLE) {
		this.writeStream = process.stdout;
	}

	return this.buildServices(servJson);
};

internals.Service.prototype = hoek.clone(ServiceSync.prototype);

internals.Service.prototype.recursiveBuildServices = function(path, services) {
	var self = this;
	var call = {
		path: path
	};

	for (var sKey in services) {
		switch (sKey) {
			case 'schema':
				call[sKey] = services[sKey];
				break;

			case 'query':
				call[sKey] = services[sKey];
				break;

			case 'method':
				// generate http method here
				for (var m in services[sKey]) {
					switch (services[sKey][m]) {
						case 'GET':
							call[services[sKey][m]] = function(options, callback) {
								/**
                  by default
                  options = {
                    headers: [],
                    body: '',               GET, DELETE ==> body will be concat as url query
                                            PUT, POST, PATCH  ==> 
                    param : {
                      p1: ''                substitution of ${p1} in url
                      p2: ''                substitution of ${p2} in url
                      ...
                    }          
                  }
                */
								return self.httpRequest(this, 'GET', options, callback);
							};
							break;
						case 'DELETE':
							call[services[sKey][m]] = function(options, callback) {
								return self.httpRequest(this, 'DELETE', options, callback);
							};
							break;
						case 'POST':
							call[services[sKey][m]] = function(options, callback) {
								return self.httpRequest(this, 'POST', options, callback);
							};
							break;
						case 'PUT':
							call[services[sKey][m]] = function(options, callback) {
								return self.httpRequest(this, 'PUT', options, callback);
							};
							break;
						case 'HEAD':
							call[services[sKey][m]] = function(options, callback) {
								return self.httpRequest(this, 'HEAD', options, callback);
							};
							break;
						case 'PATCH':
							call[services[sKey][m]] = function(options, callback) {
								return self.httpRequest(this, 'PATCH', options, callback);
							};
							break;
					}
				}
				break;

			default:
				call[sKey] = self.recursiveBuildServices(path + '/' + sKey, services[sKey]);
				break;
		}
	}
	return call;
};

internals.Service.prototype.httpRequest = function(self, method, options, callback) {
	// var self = this;
	var uri = this.url(self);
	if (uri === null) {
		throw new Error('method Service.prototype.url(self) needs to be defined in api.js');
	} else {
		var opts = this.buildOptions(method, uri, options);
		return this.rawRequest(opts, callback);
	}
};

internals.Service.prototype.rawRequest = function(opts, callback) {
	// send HTTP request within fiber and calculate response time
	// var t = new Date().getTime();
	var self = this;
	var debugInfo = {};

	if (self.writeStream) {
		debugInfo.request = opts;
	}

	if (self.debug) {
		console.log('opt    :', opts);
	}
	if (callback) {
		request(opts, function(err, response, body) {
			if (self.writeStream) {
				var res = {};
				res.payload = body;
				res.statusCode = response.statusCode;
				res.headers = response.headers;
				debugInfo.response = res;
				// debugInfo.responseTime = r.responseTime;

				var debugString = JSON.stringify(debugInfo, null, '    ');
				debugString = '//---------------------------------\n' + debugString;
				self.writeStream.write(debugString + '\n');
			}

			if (err) {
				process.nextTick(function() {
					callback(err, null, null);
				});
			}

			var cs = response.headers['set-cookie'];
			if (cs) {
				for (var i = 0; i < cs.length; i++) {
					self.cookieJar.add(request.cookie(cs[i]));
				}
			}

			return callback(null, response, body);

		});
	} else {
		var Promise = require('promise');
		return new Promise(function(resolve, reject) {
			request(opts, function(err, response, body) {
				if (self.writeStream) {
					var res = {};
					res.payload = body;
					res.statusCode = response.statusCode;
					res.headers = response.headers;
					debugInfo.response = res;
					// debugInfo.responseTime = r.responseTime;

					var debugString = JSON.stringify(debugInfo, null, '    ');
					debugString = '//---------------------------------\n' + debugString;
					self.writeStream.write(debugString + '\n');
				}

				if (err) {
					process.nextTick(function() {
						// callback(err, null, null);
						reject(err);
					});
				}

				var cs = response.headers['set-cookie'];
				if (cs) {
					for (var i = 0; i < cs.length; i++) {
						self.cookieJar.add(request.cookie(cs[i]));
					}
				}

				// return callback(null, response, body);
				process.nextTick(function() {
					resolve(response);
				});
			})
		});
	}
};

exports = module.exports = internals.Service;
