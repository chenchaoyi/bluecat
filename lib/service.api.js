var config = require("config");
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
  var api = require(file || '../config/api.json');
  // append default config to api
  var target = api[name];

  target.getPrefix = function() {
    return name;
  };

  target.config = function() {
    return config;
  };

  if(urlCallback){
    return urlCallback(target);
  }else{
    return target;
  }

};

exports.Api = internals.Api;
