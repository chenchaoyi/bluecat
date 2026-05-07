'use strict';

const Http = require('http');
const expect = require('chai').expect;
const { fromOpenAPI, hostFromOpenAPI } = require('../lib/openapi');
const Bluecat = require('../index');

describe('OpenAPI 3 -> Bluecat tree', function() {
  const spec = {
    openapi: '3.0.0',
    servers: [{ url: 'https://api.example.com/v1' }],
    paths: {
      '/users': {
        get: { summary: 'list' },
        post: { summary: 'create' }
      },
      '/users/{id}': {
        get: { summary: 'read' },
        delete: { summary: 'delete' }
      },
      '/health': {
        get: { summary: 'health' }
      }
    }
  };

  it('converts paths into nested tree with method arrays', function() {
    const tree = fromOpenAPI(spec);
    expect(tree.api).to.be.an('object');
    expect(tree.api.users).to.be.an('object');
    expect(tree.api.users.method.sort()).to.eql(['GET', 'POST']);
    expect(tree.api.users['${id}'].method.sort()).to.eql(['DELETE', 'GET']);
    expect(tree.api.health.method).to.eql(['GET']);
  });

  it('translates OpenAPI {id} path params to Bluecat ${id} keys', function() {
    const tree = fromOpenAPI({
      openapi: '3.0.0',
      paths: { '/users/{id}': { get: {} } }
    });
    expect(tree.api.users).to.have.property('${id}');
    expect(tree.api.users['${id}'].method).to.eql(['GET']);
  });

  it('adopts schema from first server URL', function() {
    const tree = fromOpenAPI(spec);
    expect(tree.api.users.schema).to.equal('https');
  });

  it('respects custom name option', function() {
    const tree = fromOpenAPI(spec, { name: 'svc' });
    expect(tree).to.have.property('svc');
  });

  it('extracts host from first server entry', function() {
    expect(hostFromOpenAPI(spec)).to.equal('api.example.com/v1');
  });

  it('throws on missing paths', function() {
    expect(() => fromOpenAPI({ openapi: '3.0.0' })).to.throw(/paths/);
  });

  it('throws on non-object spec', function() {
    expect(() => fromOpenAPI(null)).to.throw();
  });

  describe('end-to-end with a live server', function() {
    let server;
    before(function(done) {
      server = Http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ url: req.url }));
      });
      server.listen(7070, done);
    });
    after(function(done) {
      server.closeAllConnections();
      server.close(done);
    });

    it('substitutes {id} path params at request time', async function() {
      const tree = fromOpenAPI({
        openapi: '3.0.0',
        paths: { '/users/{id}': { get: {} } }
      });
      tree.api.users['${id}'].schema = 'http';

      const service = new Bluecat.Service(tree.api, 'localhost:7070');
      const r = await service.users['${id}'].GET({ params: { id: '42' } });
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.url).to.equal('/users/42');
    });
  });
});
