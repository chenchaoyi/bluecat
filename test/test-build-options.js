'use strict';

const expect = require('chai').expect;
const Path = require('path');
const Bluecat = require('../index');

describe('buildOptions / URL & header construction', function() {
  let service;

  before(function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    service = new Bluecat.Service(api, 'localhost:6767');
  });

  it('encodes query string params correctly', function() {
    const opts = service._buildOptions('GET', 'http://localhost/x', {
      query: { 'a b': '1 2', n: 3 }
    });
    expect(opts.uri).to.include('a+b=1+2');
    expect(opts.uri).to.include('n=3');
  });

  it('appends to existing query string', function() {
    const opts = service._buildOptions('GET', 'http://localhost/x?foo=1', {
      query: { bar: 2 }
    });
    expect(opts.uri).to.equal('http://localhost/x?foo=1&bar=2');
  });

  it('substitutes ${param} placeholders in URI', function() {
    const opts = service._buildOptions('GET', 'http://localhost/users/${id}/posts/${pid}', {
      params: { id: 'a/b', pid: 7 }
    });
    expect(opts.uri).to.equal('http://localhost/users/a%2Fb/posts/7');
  });

  it('merges fixedHeaders set via setHeaders', function() {
    service.setHeaders({ 'X-API-Key': 'secret' });
    const opts = service._buildOptions('GET', 'http://localhost/x');
    expect(opts.headers['X-API-Key']).to.equal('secret');
    service.setHeaders({});
  });

  it('applies sessionRules.startSessionHeader on first request', function() {
    service.setSessionRules({
      requestHeader: 'X-Session',
      responseHeader: 'X-Session',
      startSessionHeader: 'init'
    });
    const opts = service._buildOptions('GET', 'http://localhost/x');
    expect(opts.headers['X-Session']).to.equal('init');
    service.sessionRules = {};
  });

  it('rejects non-object sessionRules', function() {
    expect(() => service.setSessionRules(null)).to.throw(/object/);
    expect(() => service.setSessionRules('foo')).to.throw(/object/);
  });

  it('throws on missing host', function() {
    const api = Bluecat.Api('mobileapi', Path.join(__dirname, 'api.json'));
    expect(() => new Bluecat.Service(api)).to.throw(/Missing host/);
  });
});
