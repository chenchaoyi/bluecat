## Bluecat

[![NPM version][npm-image]][npm-url]
[![Dependency Status][david-image]][david-url]
[![Downloads][downloads-image]][downloads-url]
<!-- [![Gittip][gittip-image]][gittip-url] -->


A REST API testing framework built on node.js that makes testing API endpoints straightforward.

* Define your APIs in a json file, `Bluecat` will create all the methods for you
* Callbacks are removed so tests that have a complex API call flow will be more clear
* Full control over the request URL query, headers and body in test case
* Automatically maintains session cookies for you for HTTP API call flows
* [Convenience methods](#usage) that helps to handle complex scenario

## Installation ##
```bash
$ npm install bluecat
```

## Example ##
* First define your API in config/api.json:

```
{
  "mobileapi": {
    "typeahead": {
      "schema": "http",
      "method": ["GET"]
      }
  }
}

```

* Then in your test suite (example, using Mocha):

```javascript
var expect = require('chai').expect;
var Bluecat = require('bluecat');
var Api = Bluecat.Api('mobileapi');

describe('typeahead service test suite', function() {

  before(function() {
    t = new Bluecat.ServiceSync(Api, 'mobile.walmart.com');
  })

  it('GET typeahead?term=toy&cat=0&num=8', function(done) {
    t.run(function() {
      // send GET to typeahead?term=toy&cat=0&num=8
      var r = t.typeahead.GET({
        term: 'toy',
        cat: 0,
        num: 8
      });

      // verify response
      expect(r.err).to.equal(null);
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).to.have.ownProperty('specific');
      done();
    })
  })
})

```

## Usage ##
#### `setProxy(proxy)`
#### `resetCookie()`
#### `setHeaders(headers)`
#### `setSessionRules(rules)`
#### `rawRequest(options)`



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
