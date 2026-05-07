'use strict';

const VALID_METHODS = new Set([
  'GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH', 'OPTIONS'
]);

const RESERVED_KEYS = new Set([
  'host', 'headers', 'schema', 'method', 'query', 'path'
]);

function validateNode(node, pathStr) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(
      `Invalid api.json at "${pathStr}": expected object, got ${Array.isArray(node) ? 'array' : typeof node}`
    );
  }

  if ('method' in node) {
    if (!Array.isArray(node.method)) {
      throw new Error(`Invalid api.json at "${pathStr}.method": must be an array of HTTP methods`);
    }
    for (const m of node.method) {
      if (typeof m !== 'string' || !VALID_METHODS.has(m)) {
        throw new Error(
          `Invalid api.json at "${pathStr}.method": "${m}" is not a supported HTTP method ` +
          `(${[...VALID_METHODS].join(', ')})`
        );
      }
    }
  }

  if ('schema' in node && !['http', 'https'].includes(node.schema)) {
    throw new Error(`Invalid api.json at "${pathStr}.schema": must be "http" or "https"`);
  }

  if ('host' in node && typeof node.host !== 'string') {
    throw new Error(`Invalid api.json at "${pathStr}.host": must be a string`);
  }

  if ('headers' in node && (typeof node.headers !== 'object' || node.headers === null)) {
    throw new Error(`Invalid api.json at "${pathStr}.headers": must be an object`);
  }

  for (const key of Object.keys(node)) {
    if (RESERVED_KEYS.has(key)) continue;
    validateNode(node[key], pathStr === '' ? key : pathStr + '.' + key);
  }
}

function validateApi(tree) {
  if (tree === null || typeof tree !== 'object' || Array.isArray(tree)) {
    throw new Error('Invalid api.json: root must be an object');
  }
  validateNode(tree, '');
  return tree;
}

module.exports = validateApi;
module.exports.VALID_METHODS = VALID_METHODS;
module.exports.RESERVED_KEYS = RESERVED_KEYS;
