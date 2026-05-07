'use strict';

const Http = require('http');
const Path = require('path');

const expect = require('chai').expect;
const Bluecat = require('../index');
const Api = Bluecat.Api('mobileapi', Path.join(Path.resolve(), 'test', 'api.json'));

let t;
let s;

describe('sample tests (smoke)', function() {
  before(function(done) {
    s = Http.createServer(function(req, res) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        if (req.url === '/redirect/') {
          res.writeHead(302, { location: '/' });
          res.end();
          return;
        }
        if (req.url === '/cookie') {
          res.setHeader('Set-Cookie', 'session=abc123; Path=/');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('X-PATH', req.url);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: 'ok',
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: body || null
        }));
      });
    });

    t = new Bluecat.ServiceSync(Api, 'localhost:6767');
    s.listen(6767, done);
  });

  after(function(done) {
    s.close(done);
  });

  it('GET v1/test1/test2?term=toy&cat=0&num=2', async function() {
    const r = await t.v1.test1.test2.GET({
      query: { term: 'toy', cat: 0, num: 2 }
    });

    expect(r.err).to.equal(null);
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body).to.have.ownProperty('status');
    expect(r.data.body.url).to.eql('/v1/test1/test2?term=toy&cat=0&num=2');
  });

  it('POST sends JSON body by default', async function() {
    const r = await t.v1.test1.test2.POST({ body: { foo: 'bar' } });
    expect(r.data.statusCode).to.equal(200);
    expect(JSON.parse(r.data.body.body)).to.eql({ foo: 'bar' });
    expect(r.data.body.headers['content-type']).to.match(/application\/json/);
  });

  it('substitutes ${param} placeholders from options.params', async function() {
    const r = await t.v1.users['${id}'].GET({ params: { id: '42' } });
    expect(r.data.body.url).to.eql('/v1/users/42');
  });

  it('persists cookies between calls via cookie jar', async function() {
    const r1 = await t.cookie.GET();
    expect(r1.data.statusCode).to.equal(200);
    const r2 = await t.echo.GET();
    expect(r2.data.body.headers.cookie).to.eql('session=abc123');
  });

  it('back-compat: service.run(asyncFn) works', async function() {
    const result = await t.run(async () => {
      const r = await t.v1.test1.test2.GET();
      return r.data.statusCode;
    });
    expect(result).to.equal(200);
  });
});
