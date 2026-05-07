// Sample test suite showing bluecat framework (v2)

const Config = require('config');
const expect = require('chai').expect;
const Bluecat = require('bluecat');

let service;

describe('Sample test -> ', function() {
  before(function() {
    service = new Bluecat.Service(Bluecat.Api('api'), 'httpbin.org', {
      proxy: Config.proxy
    });
  });

  it('/post', async function() {
    const r = await service.post.POST({
      body: { location: { postalCode: '94041' } }
    });
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.json.location.postalCode).to.eql('94041');
    expect(r.data.body.url).to.eql(r.request.uri);
  });

  it('/get', async function() {
    const r = await service.get.GET();
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.url).to.eql(r.request.uri);
  });

  it('/patch', async function() {
    const r = await service.patch.PATCH({
      body: { location: { postalCode: '94041' } }
    });
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.json.location.postalCode).to.eql('94041');
  });

  it('/put', async function() {
    const r = await service.put.PUT({
      body: { location: { postalCode: '94041' } }
    });
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.json.location.postalCode).to.eql('94041');
  });

  it('/ip', async function() {
    const r = await service.ip.GET();
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.origin).to.exist;
  });

  it('/user-agent', async function() {
    const r = await service['user-agent'].GET();
    expect(r.data.statusCode).to.equal(200);
  });

  it('/headers', async function() {
    const r = await service.headers.GET();
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.headers).to.be.a('object');
  });
});
