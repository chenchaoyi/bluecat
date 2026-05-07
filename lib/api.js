'use strict';

const Path = require('path');
const validateApi = require('./validate-api');

function Api(name, apiPath, urlCallback) {
  if (arguments.length > 1 && typeof arguments[1] === 'function') {
    urlCallback = arguments[1];
    apiPath = null;
  }

  const defaultApiPath = Path.join(Path.resolve(), 'config', 'api.json');
  const api = require(apiPath || defaultApiPath);

  validateApi(api);

  const target = api[name];
  if (!target) {
    throw new Error(
      `API definition "${name}" not found in ${apiPath || defaultApiPath}. ` +
      `Available top-level keys: ${Object.keys(api).join(', ') || '(none)'}`
    );
  }

  return urlCallback ? urlCallback(target) : target;
}

module.exports = Api;
module.exports.Api = Api;
