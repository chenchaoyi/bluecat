// Sample test suite showing bluecat framework

var Config = require('config');
var expect = require('chai').expect;
var ServiceSync = require('bluecat').ServiceSync;
var Api = require('bluecat').Api;

describe('Cart -> ', function() {
  before(function() {
    lapetus = new ServiceSync(Api('lapetus'), Config.server.host);
    lapetus.setProxy(Config.server.proxy);
  });

  it('Create a new cart', function(done) {
    lapetus.run(function() {
      // create new cart
      var r = lapetus.cart.POST({});
      done();
    });
  });

  it('Create a new cart with location', function(done) {
    lapetus.run(function() {
      // create new cart
      var r = lapetus.cart.POST({
        body: {
          location: { postalCode:'94041' }
        }
      });
      done();
    });
  });

  it('Get cart with valid cart id', function(done) {
    lapetus.run(function() {
      // create new cart
      var r = lapetus.cart.POST({});
      expect(r.data.statusCode).to.equal(201);
      var cart_id = r.data.body.cart.id;

      // get cart
      r = lapetus.cart['${cartid}'].GET({
        params: {cartid: cart_id}
      });
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body.items).to.eql([]);
      expect(r.data.body.cart.id).to.eql(cart_id);
      expect(r.data.body.cart.type).to.eql('ANONYMOUS');
      expect(r.data.body.cart.itemCount).to.equal(0);
      expect(r.data.body.cart.totals).to.eql({});
      expect(r.data.body.cart.currencyCode).to.be.a('string');
      expect(r.data.body.cart.customerId).to.be.a('string');
      done();
    });
  });

});

