var path = require("path");

var internals = {};

internals.Api = function(name, file, urlCallback) {
  if(arguments.length > 1){
    if(typeof arguments[1] == 'function'){
      urlCallback = arguments[1];
      file = null;
    }
  }
  // load api from either given file or by default config/api.json
  var apiPath = path.resolve() + path.sep + 'config/api.json';
  var api = require(file || apiPath);
  // append default config to api
  var target = api[name];

  // if we want to create url on the fly
  if(urlCallback){
    return urlCallback(target);
  }else{
    return target;
  }

};

exports.Api = module.exports = internals.Api;
