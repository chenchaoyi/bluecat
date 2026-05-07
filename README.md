## Bluecat  <img src="https://raw.github.com/chenchaoyi/bluecat/master/images/bluecat.png" align="middle" />

[![NPM version][npm-image]][npm-url]
[![Bluecat CI](https://github.com/chenchaoyi/bluecat/actions/workflows/nodejs.yml/badge.svg)](https://github.com/chenchaoyi/bluecat/actions/workflows/nodejs.yml)
[![Downloads][downloads-image]][downloads-url]

**Bluecat** is a configuration-driven HTTP client for building RESTful API test
frameworks. You describe your API surface as a JSON tree once, and Bluecat
generates an ergonomic, chainable client that maintains cookies, sessions, and
headers under the hood.

* Define your API in `config/api.json` — Bluecat builds the client from it
* `async` / `await` based — no fibers, no callback nesting
* Built on [`undici`](https://undici.nodejs.org/) and [`tough-cookie`](https://www.npmjs.com/package/tough-cookie)
* Per-instance cookie jars (no module-level state pollution)
* Request / response hooks for tracing, auth refresh, retries, etc.
* Optional **OpenAPI 3** adapter — convert any spec to a Bluecat tree
* Built-in `api.json` schema validation with friendly errors
* TypeScript declarations included

> **v2.0 — breaking changes from v1.x**
> The legacy `fibers`-based `ServiceSync.run(fn)` style is gone. All request
> methods now return `Promise<RequestResult>`. The names `ServiceSync` and
> `ServiceAsync` are kept as aliases of the new unified `Service` class so
> existing imports keep working — but call sites need `await`.
> If you must stay on the old fiber-based API, pin to `bluecat@1.1.7`.

## Table of contents

- [Installation](#installation)
- [Quick example](#quick-example)
- [Examples](#examples)
- [Request options](#request-options)
- [Response shape and error handling](#response-shape-and-error-handling)
- [Service API](#service-api)
- [TypeScript](#typescript)
- [OpenAPI 3 adapter](#openapi-3-adapter)
- [Command line tool](#command-line-tool)
- [Logging](#logging)
- [Migration from v1.x](#migration-from-v1x)
- [License](#license)

---

## Installation

```bash
npm install bluecat
```

Requires **Node.js ≥ 18**.

---

## Quick example

`POST /post` then `GET /get` against `httpbin.org`:

`config/api.json`
```json
{
  "api": {
    "post": { "schema": "https", "method": ["POST"] },
    "get":  { "schema": "https", "method": ["GET"]  }
  }
}
```

```javascript
const { expect } = require('chai');
const Bluecat = require('bluecat');

const service = new Bluecat.Service(Bluecat.Api('api'), 'httpbin.org');

it('round-trips a JSON body', async () => {
  const r1 = await service.post.POST({
    body: { cartId: 'test-cart-id' }
  });
  expect(r1.data.statusCode).to.equal(200);
  expect(r1.data.body.json.cartId).to.equal('test-cart-id');

  // any cookies set by the response are auto-sent on the next call
  const r2 = await service.get.GET({ query: { hello: 'world' } });
  expect(r2.data.statusCode).to.equal(200);
});
```

---

## Examples

### Query / headers
```js
await service.search.fitness.result.PUT({
  body:    { term: 'testTerm' },
  query:   { start: 0, limit: 50, error: true },
  headers: { 'User-Agent': 'automation' }
});
```

### URL segments that are not valid JS identifiers
```js
// /cart/v1/add-item/item
await service.cart.v1['add-item'].item.GET();
```

### URL parameters
`config/api.json`
```json
{
  "api": {
    "checkout": {
      "${uuid}": {
        "contract": { "schema": "https", "method": ["GET"] }
      }
    }
  }
}
```

```js
await service.checkout['${uuid}'].contract.GET({
  params: { uuid: '5e58...c5c7b' }
});
```

### Full sample test framework
[examples/](https://github.com/chenchaoyi/bluecat/tree/master/examples)

---

## Request options

Every generated method takes a single `options` object. All fields are
optional.

| Field     | Type                  | Notes                                                                          |
|-----------|-----------------------|--------------------------------------------------------------------------------|
| `body`    | `object \| string \| Buffer` | Request payload. Object bodies are auto-serialized based on `Content-Type`: `application/json` (default) → `JSON.stringify`; `application/x-www-form-urlencoded` → `URLSearchParams`. `Buffer` / `Uint8Array` is sent as-is. |
| `query`   | `object`              | Appended as a query string with `URLSearchParams`. Merges cleanly with an existing `?…`.  |
| `params`  | `object`              | Substitutes `${name}` placeholders in the URI; values are URL-encoded.        |
| `headers` | `object`              | Per-call headers, merged on top of any tree-level / fixed headers. Values may be strings, sync functions, or async functions (see below). |

Headers can be functions for per-call dynamic values (e.g. signed
auth headers). Returning an object expands into multiple headers:

```js
await service.checkout.contract.POST({
  headers: {
    Authorization: () => `Bearer ${token()}`,
    'X-Multi':     async () => ({ 'X-Trace': '1', 'X-Span': '2' })
  }
});
```

---

## Response shape and error handling

Every request resolves (never rejects):

```ts
{
  request: { method, uri, headers, body },
  data:    { statusCode, headers, body, elapsedTime } | undefined,
  err:     Error | null
}
```

`data.body` is auto-decoded by `Content-Type`:
- `application/json` → parsed object
- `image/*` / `application/octet-stream` → `Buffer`
- anything else → string (with a best-effort JSON parse for legacy APIs that forget `Content-Type`)

Two error categories to distinguish:

```js
const r = await service.users.GET();

if (r.err) {
  // network / DNS / TLS / connection-reset failures — no HTTP exchange happened
  throw r.err;
}

if (r.data.statusCode >= 400) {
  // the server answered, but with a 4xx/5xx — inspect r.data.body
  console.error('API error', r.data.statusCode, r.data.body);
}
```

Methods do not throw on non-2xx so test assertions read top-down.

---

## Service API

#### `new Bluecat.Service(api, host, options?)`
Create a service. `options` accepts:

| Option       | Type                  | Default | Notes                                                       |
|--------------|-----------------------|---------|-------------------------------------------------------------|
| `proxy`      | `string`              | —       | HTTP proxy URI                                              |
| `strictSSL`  | `boolean`             | `true`  | Set `false` to disable TLS verification (testing only)      |
| `dispatcher` | `undici.Dispatcher`   | —       | Custom dispatcher; takes precedence over `proxy`/`strictSSL`. Use this for HTTP/2, custom CAs, mTLS, retry agents, etc. |

```js
const service = new Bluecat.Service(Bluecat.Api('mobileapi'), 'api.example.com', {
  proxy: 'http://127.0.0.1:8888'
});
```

> Aliases `Bluecat.ServiceSync` and `Bluecat.ServiceAsync` both point at
> `Service` for backward-compatible imports.

#### `setProxy(proxy)` / `setHeaders(headers)` / `getHeaders()`
Manage per-instance proxy and fixed-header overrides at any time.

#### `setSessionRules(rules)`
Carry over an auth token automatically across requests:
```js
service.setSessionRules({
  requestHeader:      'AUTH_TOKEN',
  responseHeader:     'REFRESH_AUTH_TOKEN',
  startSessionHeader: 'start-auth-token-value'
});
```

#### `resetCookie()`
Clear the in-memory cookie jar.

#### `beforeRequest(fn)` / `afterResponse(fn)`
Register hooks. Both can be `async`.

```js
service.beforeRequest(async ctx => {
  ctx.request.headers['X-Trace-Id'] = await getTraceId();
});

service.afterResponse((ctx, result) => {
  if (result.data?.statusCode >= 500) console.error('5xx', ctx.request.uri);
});
```

#### `sleep(ms)`
Returns a promise that resolves after `ms` milliseconds.

#### `Bluecat.Api(name, [apiPath], [urlCallback])`
Loader for `config/api.json`. The optional `urlCallback` is an escape
hatch when host/scheme rules cannot be expressed declaratively in the
JSON tree:

```js
// custom URL builder used by every request
const api = Bluecat.Api('mobileapi', target => {
  target.url = function (self) {
    // 'self' has { path, host, headers, schema, ... }
    return `https://${self.host || 'api.example.com'}/internal/${self.path}`;
  };
  return target;
});
const service = new Bluecat.Service(api, 'api.example.com');
```

---

## TypeScript

Bluecat ships type declarations. The base `Service` is intentionally
`[key: string]: any` because the method tree is generated from runtime
JSON. Augment it with your own interface for first-class autocomplete:

```ts
import * as Bluecat from 'bluecat';

interface MyService extends Bluecat.Service {
  users: {
    GET(opts?: Bluecat.RequestOptions): Promise<Bluecat.RequestResult>;
    '${id}': {
      GET(opts: Bluecat.RequestOptions & { params: { id: string } }):
        Promise<Bluecat.RequestResult>;
    };
  };
}

const service = new Bluecat.Service(
  Bluecat.Api('api'), 'api.example.com'
) as MyService;

const r = await service.users['${id}'].GET({ params: { id: '42' } });
//      ^? Bluecat.RequestResult
```

For projects already maintaining an OpenAPI spec, generators like
`openapi-typescript` produce richer per-endpoint types — Bluecat is
agnostic to where the types come from.

---

## OpenAPI 3 adapter

Already maintain an OpenAPI spec? Skip writing `api.json` by hand:

```js
const Bluecat = require('bluecat');
const spec = require('./openapi.json');

const tree = Bluecat.fromOpenAPI(spec);          // -> { api: { ... } }
const host = Bluecat.hostFromOpenAPI(spec);      // first server URL host
const service = new Bluecat.Service(tree.api, host);
```

OpenAPI path parameters are translated to Bluecat's `${name}` URI
template form, so the runtime API is the same as for a hand-written
tree:

```js
// OpenAPI:   /users/{id}
// Bluecat:   tree.api.users['${id}']
await service.users['${id}'].GET({ params: { id: '42' } });
```

---

## Command line tool

```bash
bluecat config             # scaffold a new test framework
bluecat api                # list routes defined in ./config/api.json
bluecat openapi <spec>     # convert an OpenAPI 3 spec to ./config/api.json
```

`bluecat openapi`:
- accepts JSON (`.json`) directly
- accepts YAML (`.yaml` / `.yml`) if you also `npm install yaml`
- always writes to `./config/api.json` (creates the directory if missing)
- prints the suggested host taken from the first `servers[].url`

`config/api.json` is validated on load. Errors point at the offending
JSON path:

```
Error: Invalid api.json at "api.v1.users.method": "FETCH" is not a supported HTTP method (GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS)
```

---

## Logging

Set one of these env vars and Bluecat appends every exchange:

* `BLUECAT_DEBUG_FILE=/path/to/bluecat.log` — append to a file
* `BLUECAT_DEBUG_CONSOLE=true`              — print to stdout

Each entry is a JSON object preceded by a separator line, suitable for
piping into `jq`:

```
//---------------------------------
{
    "request":  { "method": "GET", "uri": "...", "headers": { ... }, "body": ... },
    "response": { "statusCode": 200, "headers": { ... }, "payload": { ... } },
    "responseTime": 123
}
```

---

## Migration from v1.x

| v1.x                                            | v2.x                                                  |
|-------------------------------------------------|-------------------------------------------------------|
| `service.run(fn)` wrapping sync calls (fibers)  | `await service.foo.GET()` directly — no wrapper needed |
| `var r = service.foo.GET()` (sync via fibers)   | `const r = await service.foo.GET()` (returns a Promise) |
| `request` lib options (`gzip: true`, `agent`, …) | pass an `undici.Dispatcher` via `options.dispatcher`  |
| `node >= 0.10.21`                               | `node >= 18`                                          |

`service.run(fn)` is preserved as a thin `Promise.resolve().then(fn)`
wrapper so v1 test files migrate by sprinkling in `async/await`. New
code should call methods directly.

---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)

[npm-image]: https://img.shields.io/npm/v/bluecat.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/bluecat
[downloads-image]: http://img.shields.io/npm/dm/bluecat.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/bluecat
