'use strict';

const Http = require('http');
const Path = require('path');
const expect = require('chai').expect;
const Bluecat = require('../index');

describe('Service runtime behavior', function() {
  let server, service;
  let lastReq = null;

  before(function(done) {
    server = Http.createServer((req, res) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        lastReq = { url: req.url, method: req.method, headers: req.headers, body };

        if (req.url === '/cookie') {
          res.setHeader('Set-Cookie', 'session=abc; Path=/');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (req.url === '/session-token') {
          res.setHeader('X-Session', 'TOKEN-1');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (req.url === '/error') {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'boom' }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          url: req.url, method: req.method, headers: req.headers,
          body: body || null
        }));
      });
    });

    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    service = new Bluecat.Service(api, 'localhost:6868');
    server.listen(6868, done);
  });

  after(function(done) { server.close(done); });

  beforeEach(function() { lastReq = null; });

  it('sends request body as JSON for POST by default', async function() {
    const r = await service.v1.test1.test2.POST({ body: { a: 1 } });
    expect(r.data.statusCode).to.equal(200);
    expect(JSON.parse(r.data.body.body)).to.eql({ a: 1 });
    expect(lastReq.headers['content-type']).to.match(/application\/json/);
  });

  it('serializes form-urlencoded body when Content-Type set', async function() {
    const r = await service.v1.test1.test2.POST({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: { foo: 'bar baz', n: 1 }
    });
    expect(r.data.statusCode).to.equal(200);
    expect(lastReq.body).to.equal('foo=bar+baz&n=1');
  });

  it('persists cookies between calls', async function() {
    service.resetCookie();
    await service.cookie.GET();
    const r = await service.echo.GET();
    expect(r.data.body.headers.cookie).to.equal('session=abc');
  });

  it('resetCookie clears the jar', async function() {
    await service.cookie.GET();
    service.resetCookie();
    const r = await service.echo.GET();
    expect(r.data.body.headers.cookie).to.be.undefined;
  });

  it('extracts and re-injects sessionRules header', async function() {
    service.setSessionRules({
      requestHeader: 'x-session',
      responseHeader: 'x-session'
    });
    await service.echo.GET();
    expect(lastReq.headers['x-session']).to.be.undefined;

    // simulate a response that returns x-session
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s2 = new Bluecat.Service(api, 'localhost:6868');
    s2.setSessionRules({
      requestHeader: 'x-session',
      responseHeader: 'x-session'
    });
    // hit endpoint that emits X-Session
    const r = await s2['session-token'].GET();
    expect(r.data.statusCode).to.equal(200);
    // next call should now send x-session: TOKEN-1
    await s2.echo.GET();
    expect(lastReq.headers['x-session']).to.equal('TOKEN-1');
  });

  it('beforeRequest hook can mutate request', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s = new Bluecat.Service(api, 'localhost:6868');
    s.beforeRequest(ctx => { ctx.request.headers['X-Trace'] = 'abc-123'; });
    await s.echo.GET();
    expect(lastReq.headers['x-trace']).to.equal('abc-123');
  });

  it('afterResponse hook receives result', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s = new Bluecat.Service(api, 'localhost:6868');
    let seenStatus;
    s.afterResponse((_ctx, result) => { seenStatus = result.data.statusCode; });
    await s.echo.GET();
    expect(seenStatus).to.equal(200);
  });

  it('resolves dynamic header functions (sync and async)', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s = new Bluecat.Service(api, 'localhost:6868');
    await s.echo.GET({
      headers: {
        'X-Static': () => 'sync-value',
        'X-Async': async () => 'async-value',
        'X-Multi': () => ({ 'X-One': '1', 'X-Two': '2' })
      }
    });
    expect(lastReq.headers['x-static']).to.equal('sync-value');
    expect(lastReq.headers['x-async']).to.equal('async-value');
    expect(lastReq.headers['x-one']).to.equal('1');
    expect(lastReq.headers['x-two']).to.equal('2');
  });

  it('returns err on connection failure', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s = new Bluecat.Service(api, 'localhost:1');
    const r = await s.echo.GET();
    expect(r.err).to.be.an('error');
    expect(r.data).to.be.undefined;
  });

  it('exposes statusCode for non-2xx responses', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const s = new Bluecat.Service(api, 'localhost:6868');
    const r = await s.error.GET();
    expect(r.data.statusCode).to.equal(500);
    expect(r.data.body).to.eql({ error: 'boom' });
    expect(r.err).to.equal(null);
  });

  it('multiple Service instances do not share cookie state', async function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    const a = new Bluecat.Service(api, 'localhost:6868');
    const b = new Bluecat.Service(api, 'localhost:6868');
    await a.cookie.GET();
    const r = await b.echo.GET();
    expect(r.data.body.headers.cookie).to.be.undefined;
  });
});
