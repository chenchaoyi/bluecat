bluecat
=======

A REST API testing framework built on node.js that makes testing API endpoints straightforward.

Just define your APIs in a json file, Bluecat will create all the methods for you, plus it removes callbacks so tests that have a complex API call flow will be more clear.


## Installation ##
* Install [Node.js >= v0.10.25 and npm](http://nodejs.org/)
* Install all node package dependencies:

```bash
$ npm install
```

## Write Test ##
* Define your API in config/api.json
* Test case example (using Mocha):

First define your API in config/api.json:

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

Then in your test suite:

```javascript
var expect = require("chai").expect;
var ServiceSync = require("bluecat").ServiceSync;
var Api = require("bluecat").Api;

var host = 'mobile.walmart.com';

describe("typeahead service", function() {

  before(function() {
    t = new ServiceSync(Api("mobileapi"), host);
  })

  it("typeahead?term=xbo&cat=0&num=8", function(done) {
    t.run(function() {
      // send GET to typeahead?term=xbo&cat=0&num=8
      var r = t.typeahead.GET({
        term: 'xbox',
        cat: 8,
        num: 0
      });

      // verify response
      expect(r.err).to.equal(null);
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).to.have.ownProperty("specific");
      done();
    })
  })
})

```
