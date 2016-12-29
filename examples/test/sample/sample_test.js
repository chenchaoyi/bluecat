// Sample test suite showing bluecat framework

var Config = require('config');
var expect = require('chai').expect;
var ServiceSync = require('bluecat').ServiceSync;
var Api = require('bluecat').Api;

describe('Sample test -> ', function() {
  before(function() {
    service = new ServiceSync(Api('api'), 'httpbin.org');
    service.setProxy(Config.proxy);
  });

  it('/post', function(done) {
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
      expect(r.data.body.url).to.eql(r.request.uri);

      done();
    });
  });

  it('/get', function(done) {
    service.run(function() {
      // send GET request to httpbin.org/get
      var r = service.get.GET();
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.url).to.eql(r.request.uri);

      done();
    });
  });

  it('/patch', function(done) {
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
      expect(r.data.body.url).to.eql(r.request.uri);

      done();
    });
  });

  it('/put', function(done) {
    service.run(function() {
      // send PUT request to httpbin.org/put
      var r = service.put.PUT({
        body: {
          location: {
            postalCode: '94041'
          }
        }
      });
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.json.location.postalCode).to.eql('94041');
      expect(r.data.body.url).to.eql(r.request.uri);

      done();
    });
  });

  it('/ip', function(done) {
    service.run(function() {
      // send GET request to httpbin.org/ip
      var r = service.ip.GET();
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.origin).to.be.defined;

      done();
    });
  });

  it('/user-agent', function(done) {
    service.run(function() {
      // send GET request to httpbin.org/user-agent
      var r = service['user-agent'].GET();
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.origin).to.be.defined;

      done();
    });
  });

  it('/headers', function(done) {
    service.run(function() {
      // send GET request to httpbin.org/headers
      var r = service.headers.GET();
      // verify response
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.headers).to.be.a('object')

      done();
    });
  });

});

