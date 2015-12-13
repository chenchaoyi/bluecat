// Bluecat client command line tool
// used for setup basic test framework scaffold

var Fs = require('fs');
var Path = require('path');

var dir = Path.join(__dirname, '../../../config');

if (!Fs.existsSync(dir)){
  Fs.mkdirSync(dir);
}
