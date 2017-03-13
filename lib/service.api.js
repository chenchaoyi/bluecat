var Path = require('path');

var internals = {};

internals.Api = function(name, apiPath, urlCallback) {
  if(arguments.length > 1) {
    if(typeof arguments[1] == 'function') {
      urlCallback = arguments[1];
      apiPath = null;
    }
  }
  // load defined REST APIs from either given path (apiPath) or by default config/api.json
  var defaultApiPath = [Path.resolve(), 'config', 'api.json'].join(Path.sep);
  var api = require(apiPath || defaultApiPath);

  // append default config to api
  var target = api[name];

  // if we want to create url on the fly
  if(urlCallback) {
    return urlCallback(target);
  } else {
    return target;
  }
};

exports.Api = module.exports = internals.Api;
