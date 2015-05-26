## Bluecat  <img src="https://raw.github.com/chenchaoyi/bluecat/master/images/bluecat.png" align="middle" />


[![NPM version][npm-image]][npm-url]
[![Build Status](https://travis-ci.org/chenchaoyi/bluecat.svg?branch=master)](https://travis-ci.org/chenchaoyi/bluecat)
[![Dependency Status][david-image]][david-url]
[![Downloads][downloads-image]][downloads-url]
<!-- [![Gittip][gittip-image]][gittip-url] -->


A REST API testing framework built on Node.js that makes testing API endpoints straightforward.

* Define your APIs in a json file, `Bluecat` will create all the methods for you
* Callbacks are removed so tests that have a complex API call flow will be more clear
* Full control over the request URL query, headers and body in test case
* Automatically maintains session cookies for you for HTTP API call flows
* [Convenience methods](#usage) that helps to handle complex scenario

## Table of contents

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
- [Logging](#logging)
- [License](#license)

---

## Installation ##
```bash
$ npm install bluecat
```

---

## Example ##
#### Regular RESTful API
```
POST /checkout/contract
GET  /checkout/contract
```

* First define your API in config/api.json:

```
{
  "api": {
    "checkout": {
      "schema": "http",
      "method": ["GET", "POST"]
      }
  }
}
```

* Then create a Bluecat service object and you are all set to send request and validate response:

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Api = new Bluecat.ServiceSync(Bluecat.Api('api'), 'sample-host.com');

// All requests need to be put into Api.run(), so they will run synchronously
Api.run(function() {
    // send POST http://sample-host.com/checkout/contract
    var r = Api.checkout.contract.POST({
      body: {
        cartid: 'test-cart-id'
      }
    });
    // verify response
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body).to.have.ownProperty('id');
    
    // send GET http://sample-host.com/checkout/contract
    // session cookies are automatically maintained
    r = Api.checkout.contract.GET();
    // verify response
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.cartId).to.eql('test-cart-id');
})

```

---

## Usage ##
<!--Usage is a two steps process. First, define the API structure in config/api.json:-->

#### `Bluecat.ServiceSync(api, host, options)`
Create a new bluecat service object, with desired [options](https://github.com/request/request/blob/master/README.md#requestoptions-callback).
```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com', {
  gzip: true
});
```

#### `rawRequest(options)`
Sometimes we just want to send a request to some host, which is different than the API host we are testing. You can use `rawRequest(options)` to fully to send it.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

var r = lapetus.rawRequest({
  method: 'GET',
  json: true,
  uri: 'https://thirdparty-host/creditcard/encryption.js',
  headers: {'accept-encoding': 'gzip'},
});
expect(r.err).to.equal(null);
expect(r.data.statusCode).to.equal(200);
```

#### `setProxy(proxy)`
Set proxy address, all the requests will be sent via a connection to the proxy server.
```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

service.setProxy('http://127.0.0.1:8888')
```

#### `resetCookie()`
Clean up cookie jar, so the next request won't set any cookies in the header.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

service.v1.products.search.GET();
service.resetCookie();
service.v1.cart.POST({
  body: {
    location: '94066'
  }
})
```

#### `setHeaders(headers)`
Set headers that will be set in all the requests.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

service.setHeaders({'User-Agent': 'Automation'});
```

#### `setSessionRules(rules)`
Set extra session rules other than cookie. Some RESTful APIs defines their own session rules, you can set it in the `Bluecat` framework so you don't have to deal with it in the actual test case.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

// The following sessions rules start with 'start-auth-token-value' in the request header AUTH_TOKEN,
// then grab new value from response header REFRESH_AUTH_TOKEN
// and put it in the next request header AUTH_TOKEN
service.setSessionRules({
  requestHeader: 'AUTH_TOKEN',
  responseHeader: 'REFRESH_AUTH_TOKEN',
  startSessionHeader: 'start-auth-token-value'
});
```

---

## Logging

* Launch the node process like `BLUECAT_DEBUG_FILE=/path/to/bluecat.log node script.js` to keep a log file of all the requests/responses information.

* Launch the node process like `BLUECAT_DEBUG_CONSOLE=true node script.js` to see all the requests/responses information from your console (stdout).

---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)

[npm-image]: https://img.shields.io/npm/v/bluecat.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/bluecat
[github-tag]: http://img.shields.io/github/tag/chenchaoyi/bluecat.svg?style=flat-square
[github-url]: https://github.com/chenchaoyi/bluecat/tags
[david-image]: http://img.shields.io/david/chenchaoyi/bluecat.svg?style=flat-square
[david-url]: https://david-dm.org/chenchaoyi/bluecat
[license-image]: http://img.shields.io/npm/l/bluecat.svg?style=flat-square
[license-url]: http://opensource.org/licenses/MIT
[downloads-image]: http://img.shields.io/npm/dm/bluecat.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/bluecat
[gittip-image]: https://img.shields.io/gittip/chenchaoyi.svg?style=flat-square
[gittip-url]: https://www.gittip.com/chenchaoyi/
