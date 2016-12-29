# Introduction ##
#### Sample Web service test framework implementation based on Bluecat

## Installation ##
* Install [Node.js >= v0.10.25 and npm](http://nodejs.org/)
* Install all node package dependencies:
```bash
$ npm install
```
And that's it, all setup is done.

## Usage ##

* Run directly with [mocha](http://visionmedia.github.io/mocha/):

```bash
# Run all tests with default settings
$ ./node_modules/.bin/mocha test/sample/
```

* If you want to inspect the HTTP traffic, you can run through [Charles](https://www.charlesproxy.com/) proxy:

```bash
# Run all tests with proxy so you can inspect all the traffic
$ NODE_CONFIG='{"proxy": "http://127.0.0.1:8888"}' ./node_modules/.bin/mocha test/sample/
```

* Run in parallel with [Magellan](https://github.com/TestArmada/magellan):

```bash
$ ./node_modules/.bin/magellan
$ ./node_modules/.bin/magellan --max_workers=10
```

