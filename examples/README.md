# Introduction ##
#### Sample Web service test framework implementation based on Bluecat

## Installation ##
* Install [Node.js >= 18](http://nodejs.org/)
* Install all node package dependencies:
```bash
$ npm install
```
And that's it, all setup is done.

## Usage ##

* Run directly with [mocha](https://mochajs.org/):

```bash
# Run all tests with default settings
$ npm test
```

* Run in parallel using mocha's built-in parallel runner:

```bash
$ npm run test:parallel
```

* If you want to inspect the HTTP traffic, you can run through [Charles](https://www.charlesproxy.com/) proxy:

```bash
$ NODE_CONFIG='{"proxy": "http://127.0.0.1:8888"}' npm test
```
