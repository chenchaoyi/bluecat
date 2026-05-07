'use strict';

const Service = require('./service');
const Api = require('./api');
const validateApi = require('./validate-api');
const { fromOpenAPI, hostFromOpenAPI } = require('./openapi');
const pkg = require('../package.json');

exports.Service = Service;
// Back-compat aliases. fibers is gone, both names map to the same async Service.
exports.ServiceSync = Service;
exports.ServiceAsync = Service;
exports.Api = Api;
exports.validateApi = validateApi;
exports.fromOpenAPI = fromOpenAPI;
exports.hostFromOpenAPI = hostFromOpenAPI;
exports.version = pkg.version;
