
// Sample test suite utilizing Bluecat

var expect = require('chai').expect;
var test = require('../../test/test.js');

describe('Sample test suite', function() {
  before(function() {
    service = test.#<projectName>;
  });

  it('sample test to httpbin.org get endpoint [C001]', function(done) {
    service.run(function() {
      var r = service.get.GET({});
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).is.a('object');
      expect(r.data.body.url).to.equal('http://httpbin.org/get');
      done();
    });
  });

  it('sample test to httpbin.org post endpoint [C002]', function(done) {
    service.run(function() {
      var payload = {
        sample: {
          addressLineOne: '755 abc Ave',
          city: 'Albany'
        }
      };

      var r = service.post.POST({
        body: payload
      });
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).is.a('object');
      expect(r.data.body.json.sample.city).to.equal('Albany');
      done();
    });
  });

});
