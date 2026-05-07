'use strict';

/**
 * Convert an OpenAPI 3.x spec into a Bluecat-compatible api tree.
 *
 * OpenAPI path:    GET /v1/users/{id}
 * Bluecat tree:    { v1: { users: { id: { method: ['GET'] } } } }
 *
 * Path params named "{id}" are mapped to a child node "id". To call them at
 * runtime use `service.v1.users.id.GET({ params: { id: '42' } })`.
 */

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

function pickSchema(servers) {
  if (!servers || !servers.length) return undefined;
  for (const s of servers) {
    if (typeof s.url !== 'string') continue;
    if (s.url.startsWith('https://')) return 'https';
    if (s.url.startsWith('http://')) return 'http';
  }
  return undefined;
}

function sanitizeSegment(seg) {
  // OpenAPI allows {param} path params. Bluecat keys are JS-property-friendly.
  // We strip braces; consumers pass the value via options.params.
  if (seg.startsWith('{') && seg.endsWith('}')) {
    return seg.slice(1, -1);
  }
  return seg;
}

function fromOpenAPI(spec, options = {}) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('OpenAPI spec must be an object');
  }
  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error('OpenAPI spec missing "paths" object');
  }

  const rootName = options.name || 'api';
  const schema = pickSchema(spec.servers);

  const root = {};

  for (const rawPath of Object.keys(spec.paths)) {
    const pathItem = spec.paths[rawPath];
    if (!pathItem || typeof pathItem !== 'object') continue;

    const methods = HTTP_METHODS
      .filter(m => pathItem[m] && typeof pathItem[m] === 'object')
      .map(m => m.toUpperCase());

    if (!methods.length) continue;

    const segments = rawPath.split('/').filter(s => s.length > 0).map(sanitizeSegment);

    let cursor = root;
    for (const seg of segments) {
      if (!cursor[seg] || typeof cursor[seg] !== 'object') {
        cursor[seg] = {};
      }
      cursor = cursor[seg];
    }

    if (!cursor.method) {
      cursor.method = methods.slice();
    } else {
      for (const m of methods) {
        if (!cursor.method.includes(m)) cursor.method.push(m);
      }
    }
    if (schema && !cursor.schema) cursor.schema = schema;
  }

  return { [rootName]: root };
}

function hostFromOpenAPI(spec) {
  if (!spec || !spec.servers || !spec.servers.length) return undefined;
  for (const s of spec.servers) {
    if (typeof s.url !== 'string') continue;
    try {
      const u = new URL(s.url);
      return u.host + (u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '');
    } catch {
      // try as plain host
      const stripped = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (stripped) return stripped;
    }
  }
  return undefined;
}

module.exports = { fromOpenAPI, hostFromOpenAPI };
