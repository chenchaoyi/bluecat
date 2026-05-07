'use strict';

const Config = require('config');
const Bluecat = require('bluecat');

const api = Bluecat.Api('#<projectName>');

const service = new Bluecat.Service(api, Config.server.host, {
  proxy: Config.proxy
});

exports.#<projectName> = service;
