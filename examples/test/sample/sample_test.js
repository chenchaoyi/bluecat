// Sample test suite showing bluecat framework

var Config = require('config');
var expect = require('chai').expect;
var ServiceSync = require('bluecat').ServiceSync;
var Api = require('bluecat').Api;

describe('Sample test -> ', function() {
  before(function() {
    service = new ServiceSync(Api('api'), 'httpbin.org');
    // service.setProxy('http://127.0.0.1:8888');
  });

  it('POST request', function(done) {
    service.run(function() {
      // send POST request to httpbin.org/post
      var r = service.post.POST({
        body: {
          location: {
            postalCode: '94041'
          }
        }
      });
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.json.location.postalCode).to.eql('94041');
      expect(r.data.body.url).to.eql('http://httpbin.org/post');

      done();
    });
  });

  it('GET request', function(done) {
    service.run(function() {
      // send GET request to httpbin.org/get
      var r = service.get.GET();
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.url).to.eql('http://httpbin.org/get');

      done();
    });
  });

  it('PATCH request', function(done) {
    service.run(function() {
      // send PATCH request to httpbin.org/patch
      var r = service.patch.PATCH({
        body: {
          location: {
            postalCode: '94041'
          }
        }
      });
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.json.location.postalCode).to.eql('94041');
      expect(r.data.body.url).to.eql('http://httpbin.org/patch');

      done();
    });
  });

});

