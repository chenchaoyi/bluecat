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
* Built on top of [`undici`](https://undici.nodejs.org/) (HTTP/1.1 client maintained by the Node.js team) and [`tough-cookie`](https://www.npmjs.com/package/tough-cookie)
* Per-instance cookie jars (no module-level state pollution)
* Request / response hooks for tracing, auth refresh, etc.
* Optional **OpenAPI 3** adapter — convert any OpenAPI spec to a Bluecat tree
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
- [Service API](#service-api)
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

`POST /checkout/contract` then `GET /checkout/contract`:

`config/api.json`
```json
{
  "api": {
    "checkout": {
      "contract": {
        "schema": "https",
        "method": ["GET", "POST"]
      }
    }
  }
}
```

```javascript
const { expect } = require('chai');
const Bluecat = require('bluecat');

const service = new Bluecat.Service(Bluecat.Api('api'), 'sample-host.com');

it('checkout flow', async () => {
  const r1 = await service.checkout.contract.POST({
    body: { cartid: 'test-cart-id' }
  });
  expect(r1.data.statusCode).to.equal(200);
  expect(r1.data.body).to.have.ownProperty('id');

  // cookies set by POST are auto-sent on the next call
  const r2 = await service.checkout.contract.GET();
  expect(r2.data.body.cartId).to.eql('test-cart-id');
});
```

Each request resolves to:

```ts
{
  request: { method, uri, headers, body },
  data: { statusCode, headers, body, elapsedTime } | undefined,
  err:  Error | null
}
```

---

## Examples

### Query / headers
```js
await service.search.fitness.result.PUT({
  body: { term: 'testTerm' },
  query: { start: 0, limit: 50, error: true },
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

## Service API

#### `new Bluecat.Service(api, host, options?)`
Create a service. `options` accepts:

| Option       | Type            | Default | Notes                                                       |
|--------------|-----------------|---------|-------------------------------------------------------------|
| `proxy`      | `string`        | —       | HTTP proxy URI                                              |
| `strictSSL`  | `boolean`       | `true`  | Set `false` to disable TLS verification (testing only)      |
| `dispatcher` | `undici.Dispatcher` | — | Custom dispatcher; takes precedence over `proxy`/`strictSSL` |

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
Carry over an auth token automatically:
```js
service.setSessionRules({
  requestHeader: 'AUTH_TOKEN',
  responseHeader: 'REFRESH_AUTH_TOKEN',
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

#### Dynamic header functions
Any header value may be a (sync or async) function. Returning an object
expands into multiple headers:

```js
await service.checkout.contract.POST({
  headers: {
    Authorization: () => `Bearer ${token()}`,
    'X-Multi':     async () => ({ 'X-Trace': '1', 'X-Span': '2' })
  }
});
```

#### `sleep(ms)`
Returns a promise that resolves after `ms` milliseconds.

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

Or scaffold the file from the CLI:

```bash
bluecat openapi ./openapi.json
# wrote ./config/api.json
```

Path parameters in the OpenAPI spec (`/users/{id}`) become tree keys without
braces (`tree.api.users.id`); pass values via `params` at call time.

---

## Command line tool

```bash
bluecat config             # scaffold a new test framework
bluecat api                # list routes defined in ./config/api.json
bluecat openapi <spec>     # convert an OpenAPI 3 spec to ./config/api.json
```

`config/api.json` is validated on load. Errors point at the offending JSON
path:

```
Error: Invalid api.json at "api.v1.users.method": "FETCH" is not a supported HTTP method (GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS)
```

---

## Logging

* `BLUECAT_DEBUG_FILE=/path/to/bluecat.log` — append every request/response to a file
* `BLUECAT_DEBUG_CONSOLE=true` — print to stdout

---

## Migration from v1.x

| v1.x                                          | v2.x                                          |
|-----------------------------------------------|-----------------------------------------------|
| `service.run(function () { ... })` (fibers)   | `await service.run(async () => { ... })` *or* call methods directly |
| `var r = service.foo.GET()`                   | `const r = await service.foo.GET()`           |
| `request` library options (`gzip: true` etc.) | use `dispatcher` (undici Agent) for advanced cases |
| `node >= 0.10.21`                             | `node >= 18`                                  |

`run(fn)` is preserved as a thin wrapper (`Promise.resolve().then(fn)`) so the
shape of existing test files needs only `async/await` sprinkled in.

---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)

[npm-image]: https://img.shields.io/npm/v/bluecat.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/bluecat
[downloads-image]: http://img.shields.io/npm/dm/bluecat.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/bluecat
