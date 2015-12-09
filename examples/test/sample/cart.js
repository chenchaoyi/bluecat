// Sample test suite showing bluecat framework

var Config = require('config');
var expect = require('chai').expect;
var ServiceSync = require('bluecat').ServiceSync;
var Api = require('bluecat').Api;

describe('Cart -> ', function() {
  before(function() {
    service = new ServiceSync(Api('api'), Config.server.host);
    service.setProxy(Config.server.proxy);
  });

  it('Get cart with valid cart id', function(done) {
    service.run(function() {
      // create new cart
      var r = service.cart.POST({
        body: {
          location: {
            postalCode: '94041'
          }
        }
      });
      expect(r.data.statusCode).to.equal(201);
      var cart_id = r.data.body.cart.id;

      // get cart
      r = service.cart['${cartid}'].GET({
        params: {cartid: cart_id}
      });
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.cart.id).to.eql(cart_id);
      expect(r.data.body.cart.type).to.eql('ANONYMOUS');
      expect(r.data.body.cart.itemCount).to.equal(0);
      expect(r.data.body.cart.totals).to.eql({});
      expect(r.data.body.cart.currencyCode).to.be.a('string');
      done();
    });
  });

});

