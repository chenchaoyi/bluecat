var Http = require('http');
var Path = require('path');

var expect = require('chai').expect;
var Bluecat = require('../index');
var Api = Bluecat.Api('mobileapi', Path.resolve() + Path.sep + 'test/api.json');
var t;

// create local HTTP server
var s = Http.createServer(function(req, res) {
  if (req.url === '/redirect/') {
    res.writeHead(302, {
      location : '/'
    });
  } else {
    res.statusCode = 200;
    res.setHeader('X-PATH', req.url);
  }
  res.end('{"status": "ok", "url": "' + req.url + '"}');
});


describe('sample tests', function() {

  before(function(done) {
    t = new Bluecat.ServiceSync(Api, 'localhost:6767');

    s.listen(6767, function() {
      done();
    });
  });

  after(function(done) {
    s.close(function() {
      done();
    });
  });

  it('GET v1/test1/test2?term=toy&cat=0&num=2', function(done) {
    t.run(function() {
      // send GET to http://localhost/v1/test1/test2?term=toy&cat=0&num=2
      var r = t.v1.test1.test2.GET({
        query: {
          term: 'toy',
          cat: 0,
          num: 2
        }
      });

      // verify response
      expect(r.err).to.equal(null);
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).to.have.ownProperty('status');
      expect(r.data.body.url).to.eql('/v1/test1/test2?term=toy&cat=0&num=2');
      done();
    });
  });

});

