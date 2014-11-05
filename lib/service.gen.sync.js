/*jshint loopfunc: true */
var qs = require('querystring');
var fs = require('fs');
var Hoek = require('hoek');
var LFiber = require('./fiber');

var request = require('request').defaults({
  timeout: '500000',
  strictSSL: false
});

// define internals
var internals = {};

internals.Service = function(servJson, host) {
  if (host === undefined) {
    throw new Error('Missing host when trying to create services...');
  }
  this.proxy = undefined;
  this.host = host;
  return this.buildServices(servJson);
};

internals.Service.prototype.setProxy = function(proxy) {
  this.proxy = proxy;
}

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
    var a = this.recursiveBuildServices(s, services[s]);
    this[s] = a;
  }
};

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
              call[services[sKey][m]] = function(options) {
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
                return self.httpRequest(this, 'GET', options);
              };
              break;
            case 'DELETE':
              call[services[sKey][m]] = function(options) {
                return self.httpRequest(this, 'DELETE', options);
              };
              break;
            case 'POST':
              call[services[sKey][m]] = function(options) {
                return self.httpRequest(this, 'POST', options);
              };
              break;
            case 'PUT':
              call[services[sKey][m]] = function(options) {
                return self.httpRequest(this, 'PUT', options);
              };
              break;
            case 'HEAD':
              call[services[sKey][m]] = function(options) {
                return self.httpRequest(this, 'HEAD', options);
              };
              break;
            case 'PATCH':
              call[services[sKey][m]] = function(options) {
                return self.httpRequest(this, 'PATCH', options);
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

internals.Service.prototype.httpRequest = function(self, method, options) {
  // var self = this;
  var uri = this.url(self);
  if (uri === null) {
    throw new Error('method Service.prototype.url(self) needs to be defined in api.js');
  } else {
    var opts = this.buildOptions(method, uri, options);
    return this.rawRequest(opts);
  }
};

internals.Service.prototype.buildOptions = function(method, uri, options) {
  // assign default value to headers param
  var opts = {
    json: true, // by default headers['content-type'] = 'application/json'
    method: method,
    jar: true,
    uri: uri,
    headers: {
      'Content-Type': 'application/json'
    },
    proxy: this.proxy
  };

  // opts = Hoek.applyToDefaults(opts, options);
  if (options) {
    if (!options.body && !options.headers && !options.params && !options.query) {
      // only passing http body here
      if (['GET', 'DELETE'].indexOf(method) > -1) {
        opts.uri += '?' + qs.stringify(options);
      } else {
        opts.body = JSON.stringify(options);
      }
    } else {
      if (options.body) {
        if (['GET', 'DELETE'].indexOf(method) > -1) {
          opts.uri += '?' + qs.stringify(options.body);
        } else if(options.headers !== undefined) {
          if(options.headers['Content-Type'] == 'application/x-www-form-urlencoded') {
            opts.body = qs.stringify(options.body);
          } else if(options.headers['Content-Type'] == 'image/jpeg') {
            opts.body = options.body;
            opts.json = false;
          } else {
            opts.body = JSON.stringify(options.body);
          }
        } else {
          opts.body = JSON.stringify(options.body);
        }
      }

      if (options.query) {
        opts.uri += '?' + qs.stringify(options.query);
      }

      if (options.headers) {
        opts.headers = Hoek.merge(opts.headers, options.headers);
      }

      if (options.params) {
        // for url params replacement 
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
  var r = LFiber.Fiber(request, opts);
  r.responseTime = new Date().getTime() - t;
  r.request = opts;

  // handle network connection error
  if (r.hasOwnProperty('err') && r.data === undefined) {
    throw r.err;
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

    internals.writeStream = fs.createWriteStream(
      process.env.BLUECAT_DEBUG_FILE,
      { flags: 'a' }
    );
};

internals.init();

