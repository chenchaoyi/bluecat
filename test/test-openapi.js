'use strict';

const expect = require('chai').expect;
const { fromOpenAPI, hostFromOpenAPI } = require('../lib/openapi');

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
    expect(tree.api.users.id.method.sort()).to.eql(['DELETE', 'GET']);
    expect(tree.api.health.method).to.eql(['GET']);
  });

  it('strips path-param braces in segment keys', function() {
    const tree = fromOpenAPI({
      openapi: '3.0.0',
      paths: { '/users/{id}': { get: {} } }
    });
    expect(tree.api.users).to.have.property('id');
    expect(tree.api.users.id.method).to.eql(['GET']);
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
});
