// Sample test suite using Bluecat 2.x

const expect = require('chai').expect;
const test = require('../test.js');

describe('Sample test suite', function() {
  let service;

  before(function() {
    service = test.#<projectName>;
  });

  it('GET /get on httpbin.org [C001]', async function() {
    const r = await service.get.GET();
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body).to.be.an('object');
    expect(r.data.body.url).to.match(/httpbin\.org\/get/);
  });

  it('POST /post on httpbin.org [C002]', async function() {
    const payload = { sample: { addressLineOne: '755 abc Ave', city: 'Albany' } };
    const r = await service.post.POST({ body: payload });
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.json.sample.city).to.equal('Albany');
  });
});
