## Bluecat  <img src="https://raw.github.com/chenchaoyi/bluecat/master/images/bluecat.png" align="middle" />


[![NPM version][npm-image]][npm-url]
[![Build Status](https://travis-ci.org/chenchaoyi/bluecat.svg?branch=master)](https://travis-ci.org/chenchaoyi/bluecat)
[![Dependency Status][david-image]][david-url]
[![Downloads][downloads-image]][downloads-url]
[![Gitter](https://badges.gitter.im/chenchaoyi/bluecat.svg)](https://gitter.im/chenchaoyi/bluecat?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
<!-- [![Gittip][gittip-image]][gittip-url] -->

`Bluecat` is a library that helps to easily create HTTP requests and maintain session information underlayer. 

It could be integrated with any Node.js test framework and assertion library to create a clear and straighforward `Web services API testing framework`.

* Define your APIs in a JSON file, `Bluecat` automatically creates all the methods for you
* Callbacks are removed so complex requests flow is more clear
* Full control over the HTTP request URL query, headers and body
* Automatically maintains session cookies information for HTTP API call flows
* [Convenience methods](#usage) that help to handle more complex scenario
* The `bluecat` command line interface comes with a nice configuration utility that helps you to create your test framework in less than a minute.

## Table of contents

- [Installation](#installation)
- [Examples](#example)
- [Usage](#usage)
- [Command line tool](#command-line-tool)
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
      "contract": {
        "schema": "http",
        "method": ["GET", "POST"]
      }
    }
  }
}
```

* Then create a Bluecat service object. You are all set to send request and validate response:

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Service = new Bluecat.ServiceSync(Bluecat.Api('api'), 'sample-host.com');

// All requests need to be put as callback function in Service.run(), so they will run synchronously
Service.run(function() {
    // send POST http://sample-host.com/checkout/contract
    // with body: {"cartid": "test-cart-id"}
    var r = Service.checkout.contract.POST({
      body: {
        cartid: 'test-cart-id'
      }
    });
    // verify response
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body).to.have.ownProperty('id');

    // send GET http://sample-host.com/checkout/contract
    // cookies are automatically maintained if there is any
    r = Service.checkout.contract.GET();
    // verify response
    expect(r.data.statusCode).to.equal(200);
    expect(r.data.body.cartId).to.eql('test-cart-id');
})

```

#### Control query and/or headers in request
```
PUT /search/fitness/result?start=0&limit=50&error=true
```

* First define your API in config/api.json:

```
{
  "api": {
    "search": {
      "fitness": {
        "result": {
          "schema": "https",
          "method": ["PUT"]
        }
      }
    }
  }
}
```

* Then create a Bluecat service object. You are all set to send request and validate response:

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Service = new Bluecat.ServiceSync(Bluecat.Api('api'), 'sample-host.com');

// All requests need to be put as callback function in Service.run(), so they will run synchronously
Service.run(function() {
    // send PUT http://sample-host.com/search/fitness/result?start=0&limit=50&error=true
    // with body: {"term": "testTerm"}
    // and header: {"User-agent": "automation"}
    var r = Service.search.fitness.result.PUT({
      body: {
        term: 'testTerm'
      },
      query: {
        start: 0,
        limit: 50,
        error: true
      },
      headers: {
        'User-agent': 'automation'
      }
    });
    // verify response
    expect(r.data.statusCode).to.equal(200);
})

```


#### RESTful API with characters that cannot be used with [dot notation] (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_Accessors) in the URL
```
GET  /cart/v1/add-item/item
```

* First define your API in config/api.json:

```
{
  "api": {
    "cart": {
      "v1": {
        "add-item": {
          "item": {
            "schema": "http",
            "method": ["GET"]
          }
        }
      }
    }
  }
}
```

* Then create a Bluecat service object and send request:

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Service = new Bluecat.ServiceSync(Bluecat.Api('api'), 'sample-host.com');

// All requests need to be put as callback function in Service.run(), so they will run synchronously
Service.run(function() {
    // send GET http://sample-host.com/cart/v1/add-item/item
    // we cannot use 'r = Service.cart.v1.add-item.item.GET()' because 'add-item' cannot be used
    // as dot notation property accessor, we need to use bracket notation in such case
    r = Service.cart.v1['add-item'].item.GET();
    // verify response
    expect(r.data.statusCode).to.equal(200);
})

```

#### RESTful API with parameters in the URL
```
GET /checkout/${uuid}/contract
```
* First define your API in config/api.json:

```
{
  "api": {
    "checkout": {
      "${uuid}": {
        "contract": {
          "schema": "http",
          "method": ["GET"]
        }
      }
    }
  }
}
```

* Then create a Bluecat service object. You are all set to send request and validate response:

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Service = new Bluecat.ServiceSync(Bluecat.Api('api'), 'sample-host.com');

// All requests need to be put as callback function in Service.run(), so they will run synchronously
Service.run(function() {
    // send GET http://sample-host.com/checkout/5e586387-6d5a-4874-8a98-5836bdc45c7b/contract
    var r = Service.checkout['${uuid}'].contract.GET({
      params: {
        uuid: '5e586387-6d5a-4874-8a98-5836bdc45c7b'
      }
    });
    // verify response
    expect(r.data.statusCode).to.equal(200);
})
```

#### Full example of test structure using Bluecat

[Example](https://github.com/chenchaoyi/bluecat/tree/master/examples)


---

## Usage ##
<!--Usage is a two steps process. First, define the API structure in config/api.json:-->

#### `Bluecat.ServiceSync(api, host, options)`
Create a new bluecat service object, with desired [options](https://github.com/request/request/blob/master/README.md#requestoptions-callback).
```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com', {
  gzip: true
});
```

#### `rawRequest(options)`
Sometimes we just want to send a request to some host, which is different than the API host we gave to the bluecat service object. You can use `rawRequest(options)` to send it.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

var r = Service.rawRequest({
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
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

Service.setProxy('http://127.0.0.1:8888')
```

#### `resetCookie()`
Clean up cookie jar, so the next request won't set any cookies in the header.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

Service.v1.products.search.GET();
Service.resetCookie();
Service.v1.cart.POST({
  body: {
    location: '94066'
  }
})
```

#### `setHeaders(headers)`
Set headers that will be sent in all the requests.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

Service.setHeaders({'User-Agent': 'Automation'});
```

#### `setSessionRules(rules)`
Set extra session rules other than cookie. Some RESTful APIs defines their own session rules, you can set such rule to the bluecat service object, so you don't have to deal with it before sending every single HTTP request.

```javascript
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');
var Service = new Bluecat.ServiceSync(Api, 'api.mobile.walmart.com');

// The following sessions rules start with value 'start-auth-token-value' in the request header AUTH_TOKEN,
// then grab new value from response header REFRESH_AUTH_TOKEN
// and put it in the next request header AUTH_TOKEN
Service.setSessionRules({
  requestHeader: 'AUTH_TOKEN',
  responseHeader: 'REFRESH_AUTH_TOKEN',
  startSessionHeader: 'start-auth-token-value'
});
```

---

## Command line tool ##
Bluecat comes with `bluecat` command line interface that helps you to create a basic Web services API test framework.

```bash
$ npm install bluecat
$ ./node_modules/.bin/bluecat config
```
Follow the instructions and it will create a scaffold of basic web services API test framework for you.


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
