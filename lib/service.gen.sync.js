/*jshint loopfunc: true */

var Qs = require('querystring');
var Fs = require('fs');
var Hoek = require('hoek');
var LFiber = require('./fiber');

var Request = require('request').defaults({
  strictSSL: false
});

var internals = {};

internals.Service = function(servJson, host) {
  if (host === undefined) {
    throw new Error('Missing host when trying to create services...');
  }
  this.proxy = undefined;
  this.host = host;
  this.fixedHeaders = {};
  this.sessionRules = {};
  return this.buildServices(servJson);
};

// set proxy for all requests
internals.Service.prototype.setProxy = function(proxy) {
  this.proxy = proxy;
};

// set headers that will stay in all requests
internals.Service.prototype.setHeaders = function(headers) {
  this.fixedHeaders = headers;
};

// set extra session rules applied to all requests
// params:
// {
//   requestHeader: String,     // request header key to be updated for each request
//   responseHeader: String,    // response header key to be extracted and put into next request
//   startSessionHeader: String // request header value to start with
// }
internals.Service.prototype.setSessionRules = function(rules) {
  if (rules === null || typeof rules !== 'object') {
    throw new Error('Session rules need to be an object...');
  }
  this.sessionRules = rules;
  this.sessionRules.currentSessionValue = null;
};

internals.Service.prototype.url = function(self) {
  // by default url will follow strict restful api protocol
  // the schema passed in config will overwrite the schema defined in api.json
  if (this.host.indexOf('http://')===0 || this.host.indexOf('https://')===0) {
    return this.host + (self.path !== '' ? '/' + self.path : '');
  } else {
    return self.schema + '://' + this.host + (self.path !== '' ? '/' + self.path : '');
  }
};

internals.Service.prototype.buildServices = function(services) {
  // in case overwritten by api.js
  this.url = services.url || this.url;

  for (var s in services) {
    if (typeof services[s] === 'function') {
      continue;
    }
    var a = this.recursiveBuildServices(s, services[s], services[s].host);
    this[s] = a;
  }
};

internals.Service.prototype.recursiveBuildServices = function(path, services, host) {
  var self = this;
  var call = {
    path: path,
    host: host
  };

  for (var sKey in services) {
    switch (sKey) {
      case 'host':
        call[sKey] = services[sKey];
        break;

      case 'schema':
        call[sKey] = services[sKey];
        break;

      case 'query':
        call[sKey] = services[sKey];
        break;

      case 'method':
        // generate method for each specified HTTP method
        services[sKey].forEach(function(method) {
          call[method] = function(options) {
            return self.httpRequest(this, method, options);
          };
        });
        break;

      default:
        call[sKey] = self.recursiveBuildServices(path + '/' + sKey, services[sKey], call.host);
        break;
    }
  }
  return call;
};

internals.Service.prototype.httpRequest = function(self, method, options) {
  if (self.host) {
    var uri = self.host + (self.path !== '' ? '/' + self.path : '');
  } else {
    var uri = this.url(self);
  }

  if (uri === null) {
    throw new Error('method Service.prototype.url(self) needs to be defined in api.js');
  } else {
    var opts = this.buildOptions(method, uri, options);
    return this.rawRequest(opts);
  }
};

internals.Service.prototype.buildOptions = function(method, uri, options) {
  // default options
  var opts = {
    json: true, // by default headers['Content-Type'] = 'application/json'
    method: method,
    jar: true,
    uri: uri,
    headers: {
      'Content-Type': 'application/json'
    },
    proxy: this.proxy
  };

  // merge fixed headers
  opts.headers = Hoek.merge(opts.headers, this.fixedHeaders);

  // handle extra session rules headers
  if (this.sessionRules.currentSessionValue) {
    opts.headers[this.sessionRules.requestHeader] = this.sessionRules.currentSessionValue
  } else if (this.sessionRules.startSessionHeader) {
    opts.headers[this.sessionRules.requestHeader] = this.sessionRules.startSessionHeader
  }

  // opts = Hoek.applyToDefaults(opts, options);
  if (options) {
    // if options are passed in without body/headers/params/query,
    // treat them as query for GET/DELETE, and body as for other methods
    if (!options.body && !options.headers && !options.params && !options.query) {
      if (method == 'GET' || method == 'DELETE') {
        opts.uri += '?' + Qs.stringify(options);
      } else {
        opts.body = options;
      }
    } else {
      if (options.body) {
        if(options.headers) {
          if(options.headers['Content-Type'] == 'application/x-www-form-urlencoded') {
            opts.body = Qs.stringify(options.body);
          } else if(options.headers['Content-Type'] == 'image/jpeg') {
            opts.json = false;
            opts.body = options.body;
          } else {
            opts.body = options.body;
          }
        } else {
          opts.body = options.body;
        }
      }

      if (options.query) {
        opts.uri += '?' + Qs.stringify(options.query);
      }

      if (options.headers) {
        opts.headers = Hoek.merge(opts.headers, options.headers);
      }

      // replace URL params
      // e.g. ${id} as in http://api/v1/product/${id}
      if (options.params) {
        for (var k in options.params) {
          opts.uri = opts.uri.replace('${' + k + '}', options.params[k]);
        }
      }
    }
  }

  return opts;
};

internals.Service.prototype.rawRequest = function(opts) {
  // send HTTP request within fiber and calculate response time
  var t = new Date().getTime();
  var r = LFiber.Fiber(Request, opts);
  r.responseTime = new Date().getTime() - t;
  r.request = opts;

  // handle network connection error
  if (r.hasOwnProperty('err') && r.data === undefined) {
    throw r.err;
  }

  // update extra session rules headers
  if (r.data.headers[this.sessionRules.responseHeader]) {
    this.sessionRules.currentSessionValue = r.data.headers[this.sessionRules.responseHeader];
    this.sessionRules.startSessionHeader = r.data.headers[this.sessionRules.responseHeader];
  }

  // logging handling
  if (internals.writeStream) {
    var res = {};
    res.payload = r.data.body;
    res.statusCode = r.data.statusCode;
    res.headers = r.data.headers;
    var debugInfo = {request: opts, response: res};
    debugInfo.responseTime = r.responseTime;
    var debugString = JSON.stringify(debugInfo, null, '    ');
    debugString = '//---------------------------------\n' + debugString;
    internals.writeStream.write(debugString + '\n');
  }

  return r;
};


// integrate light.fiber
internals.Service.prototype.run = function(fiberFuncs) {
  return LFiber.Fire(fiberFuncs);
};

internals.Service.prototype.sleep = function(ms) {
  return LFiber.Sleep(ms);
};

exports = module.exports = internals.Service;

// simple logging hanlding
internals.init = function () {

  if (process.env.BLUECAT_DEBUG_CONSOLE) {
    internals.writeStream = process.stdout;
    return;
  }

  if (!process.env.BLUECAT_DEBUG_FILE) {
    return;
  }

  internals.writeStream = Fs.createWriteStream(
    process.env.BLUECAT_DEBUG_FILE,
    { flags: 'a' }
  );
};

internals.init();

