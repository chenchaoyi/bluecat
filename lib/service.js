'use strict';

const Fs = require('fs');
const { URLSearchParams } = require('url');
const { request: undiciRequest, ProxyAgent, Agent } = require('undici');
const { CookieJar } = require('tough-cookie');

const RESERVED_NODE_KEYS = new Set(['host', 'headers', 'schema', 'method', 'query', 'path']);

class Service {
  constructor(servJson, host, options = {}) {
    if (!host) {
      throw new Error('Missing host when trying to create services...');
    }
    if (!servJson || typeof servJson !== 'object') {
      throw new Error('Missing or invalid API definition tree');
    }

    this.host = host;
    this.options = options;
    this.proxy = options.proxy;
    this.fixedHeaders = {};
    this.sessionRules = {};
    this.cookieJar = new CookieJar();
    this.beforeRequestHooks = [];
    this.afterResponseHooks = [];
    this.dispatcher = options.dispatcher;
    this.strictSSL = options.strictSSL !== false;

    this._initLogStream();
    this._buildServices(servJson);
  }

  _initLogStream() {
    if (process.env.BLUECAT_DEBUG_CONSOLE) {
      this.writeStream = process.stdout;
    } else if (process.env.BLUECAT_DEBUG_FILE) {
      this.writeStream = Fs.createWriteStream(process.env.BLUECAT_DEBUG_FILE, { flags: 'a' });
    }
  }

  setProxy(proxy) {
    this.proxy = proxy || undefined;
  }

  setHeaders(headers) {
    this.fixedHeaders = headers || {};
  }

  getHeaders() {
    return this.fixedHeaders;
  }

  setSessionRules(rules) {
    if (rules === null || typeof rules !== 'object') {
      throw new Error('Session rules need to be an object...');
    }
    this.sessionRules = Object.assign({}, rules, { currentSessionValue: null });
  }

  resetCookie() {
    this.cookieJar = new CookieJar();
  }

  beforeRequest(fn) {
    if (typeof fn !== 'function') throw new Error('beforeRequest hook must be a function');
    this.beforeRequestHooks.push(fn);
  }

  afterResponse(fn) {
    if (typeof fn !== 'function') throw new Error('afterResponse hook must be a function');
    this.afterResponseHooks.push(fn);
  }

  url(self) {
    if (this.host.indexOf('http://') === 0 || this.host.indexOf('https://') === 0) {
      return this.host + (self.path !== '' ? '/' + self.path : '');
    }
    const schema = self.schema || 'https';
    return schema + '://' + this.host + (self.path !== '' ? '/' + self.path : '');
  }

  _buildServices(services) {
    if (typeof services.url === 'function') {
      this.url = services.url;
    }
    for (const s in services) {
      if (RESERVED_NODE_KEYS.has(s)) continue;
      if (typeof services[s] === 'function') continue;
      this[s] = this._buildNode(s, services[s], services[s].host, services[s].headers);
    }
  }

  _buildNode(path, node, host, headers) {
    headers = headers || {};
    const self = this;
    const call = { path, host, headers };

    for (const key in node) {
      switch (key) {
        case 'host':
        case 'headers':
        case 'schema':
        case 'query':
          call[key] = node[key];
          break;
        case 'method':
          for (const method of node[key]) {
            call[method] = function (options) {
              const opts = options || {};
              opts.headers = Object.assign({}, call.headers, opts.headers || {});
              return self._httpRequest(this, method, opts);
            };
          }
          break;
        default:
          call[key] = self._buildNode(
            path + '/' + key,
            node[key],
            node[key].host || call.host,
            Object.assign({}, call.headers, node[key].headers || {})
          );
          break;
      }
    }
    return call;
  }

  _httpRequest(self, method, options) {
    let uri;
    if (self.host) {
      uri = self.host + (self.path !== '' ? '/' + self.path : '');
      if (!/^https?:\/\//.test(uri)) {
        uri = (self.schema || 'https') + '://' + uri;
      }
    } else {
      uri = this.url(self);
    }
    if (uri == null) {
      throw new Error('method Service.url(self) needs to be defined in api.js');
    }
    const opts = this._buildOptions(method, uri, options);
    return this._rawRequest(opts);
  }

  _buildOptions(method, uri, options) {
    const opts = {
      method,
      uri,
      headers: { 'Content-Type': 'application/json' }
    };

    if (options && options.headers) {
      Object.assign(opts.headers, options.headers);
    }
    Object.assign(opts.headers, this.fixedHeaders);

    if (this.sessionRules.currentSessionValue) {
      opts.headers[this.sessionRules.requestHeader] = this.sessionRules.currentSessionValue;
    } else if (this.sessionRules.startSessionHeader) {
      opts.headers[this.sessionRules.requestHeader] = this.sessionRules.startSessionHeader;
    }

    if (options) {
      if (options.body !== undefined) opts.body = options.body;
      if (options.query) {
        const qs = new URLSearchParams(options.query).toString();
        if (qs) opts.uri += (opts.uri.indexOf('?') >= 0 ? '&' : '?') + qs;
      }
      if (options.params) {
        for (const k of Object.keys(options.params)) {
          opts.uri = opts.uri.replace('${' + k + '}', encodeURIComponent(options.params[k]));
        }
      }
    }

    return opts;
  }

  async _rawRequest(opts) {
    const headers = Object.assign({}, opts.headers);
    for (const key of Object.keys(headers)) {
      if (typeof headers[key] === 'function') {
        const dyn = await headers[key]();
        if (dyn !== null && typeof dyn === 'object') {
          delete headers[key];
          Object.assign(headers, dyn);
        } else {
          headers[key] = dyn;
        }
      }
    }

    let body = opts.body;
    const ctHeader = Object.keys(headers).find(h => h.toLowerCase() === 'content-type');
    const contentType = ctHeader ? String(headers[ctHeader] || '') : '';

    if (body !== undefined && body !== null && typeof body === 'object'
      && !Buffer.isBuffer(body) && !(body instanceof Uint8Array) && typeof body.pipe !== 'function') {
      if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
        body = new URLSearchParams(body).toString();
      } else if (contentType.indexOf('application/json') >= 0 || !contentType) {
        body = JSON.stringify(body);
        if (!ctHeader) headers['Content-Type'] = 'application/json';
      }
    }

    const cookieHeader = await this.cookieJar.getCookieString(opts.uri);
    if (cookieHeader) {
      headers.Cookie = headers.Cookie ? headers.Cookie + '; ' + cookieHeader : cookieHeader;
    }

    const ctx = {
      request: { method: opts.method, uri: opts.uri, headers, body }
    };

    for (const fn of this.beforeRequestHooks) {
      await fn(ctx);
    }

    const dispatcher = this._buildDispatcher();
    const startTime = Date.now();
    let response, responseBody, err = null;

    try {
      response = await undiciRequest(ctx.request.uri, {
        method: ctx.request.method,
        headers: ctx.request.headers,
        body: ctx.request.body,
        dispatcher
      });

      const respCt = String(response.headers['content-type'] || '');
      if (respCt.indexOf('application/json') >= 0) {
        responseBody = await response.body.json();
      } else if (respCt.startsWith('image/') || respCt.indexOf('octet-stream') >= 0) {
        responseBody = Buffer.from(await response.body.arrayBuffer());
      } else {
        const text = await response.body.text();
        try { responseBody = JSON.parse(text); } catch { responseBody = text; }
      }
    } catch (e) {
      err = e;
    }

    const elapsedTime = Date.now() - startTime;

    if (err) {
      const errResult = { request: ctx.request, data: undefined, err };
      this._log(ctx.request, null, elapsedTime);
      return errResult;
    }

    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      const list = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const c of list) {
        try { await this.cookieJar.setCookie(c, ctx.request.uri); } catch { /* ignore bad cookies */ }
      }
    }

    if (this.sessionRules.responseHeader && response.headers[this.sessionRules.responseHeader]) {
      const v = response.headers[this.sessionRules.responseHeader];
      this.sessionRules.currentSessionValue = v;
      this.sessionRules.startSessionHeader = v;
    }

    const data = {
      statusCode: response.statusCode,
      headers: response.headers,
      body: responseBody,
      elapsedTime
    };
    const result = { request: ctx.request, data, err: null };

    for (const fn of this.afterResponseHooks) {
      await fn(ctx, result);
    }

    this._log(ctx.request, data, elapsedTime);
    return result;
  }

  _buildDispatcher() {
    if (this.dispatcher) return this.dispatcher;
    if (this.proxy) return new ProxyAgent({ uri: this.proxy });
    if (!this.strictSSL) {
      return new Agent({ connect: { rejectUnauthorized: false } });
    }
    return undefined;
  }

  _log(request, response, elapsedTime) {
    if (!this.writeStream) return;
    const debugInfo = {
      request,
      response: response ? {
        statusCode: response.statusCode,
        headers: response.headers,
        payload: response.body
      } : null,
      responseTime: elapsedTime
    };
    this.writeStream.write(
      '//---------------------------------\n' +
      JSON.stringify(debugInfo, null, '    ') + '\n'
    );
  }

  run(fn) {
    return Promise.resolve().then(() => fn());
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Service;
