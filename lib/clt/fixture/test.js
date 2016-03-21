
var Config = require('config');
var Bluecat = require('bluecat');

var api = Bluecat.Api('#<projectName>');

service = new Bluecat.ServiceSync(api, Config.server.host);
service.setProxy(Config.proxy);
exports.#<projectName> = service;
