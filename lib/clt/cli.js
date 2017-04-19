/*
 Bluecat client command line tool
 used for:
 1. setup the following basic test framework scaffold
 ├── config
 │   ├── api.json
 │   └── default.json
 ├── package.json
 ├── magellan.json
 └── test
     ├── projectName
     │   └── sample.js
     └── test.js
 2. list defined web services API
*/

var Fs = require('fs');
var Path = require('path');
var Inquirer = require('inquirer');
var Exec = require('child_process').exec;
var Columnify = require('columnify');
var argv = require('yargs')
  .usage('Usage: $0 <config|api>')
  .demand(1)
  .argv;

var questions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'What\'s the name of your project (one word, no digits or special characters)',
    validate: function( value ) {
      var pass = value.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/i);
      if (pass) {
        return true;
      } else {
        return 'Please enter a valid project name';
      }
    }
  },
  {
    type: 'confirm',
    name: 'toContinue',
    message: 'This will create a basic test structure in the current directory and install nessasary npm packages locally. Are you sure to continue',
    default: true
  }
];

if(argv._[0] === 'config') {
  console.log('\n===========================================');
  console.log('Bluecat Test Framework Configuration Helper');
  console.log('===========================================\n');

  Inquirer.prompt(questions).then(function(answers) {
    // console.log( JSON.stringify(answers, null, '  ') );

    if (!answers.toContinue) {
      process.exit(0);
    }
    var projectName = answers.projectName.toLowerCase();

    // setting up config dir
    var dir = Path.join(process.cwd(), 'config');
    if (!Fs.existsSync(dir)){
      Fs.mkdirSync(dir);
    }
    // - write config/api.json
    var content = Fs.readFileSync( __dirname + Path.sep + 'fixture/api.json', 'utf8');
    content = content.replace(/#<projectName>/g, projectName);
    Fs.appendFileSync(Path.join(dir, 'api.json'), content);
    // - write config/default.json
    content = Fs.readFileSync( __dirname + Path.sep + 'fixture/default.json', 'utf8');
    Fs.appendFileSync(Path.join(dir, 'default.json'), content);

    // setting up test dir
    dir = Path.join(process.cwd(), 'test');
    if (!Fs.existsSync(dir)){
      Fs.mkdirSync(dir);
    }
    // - write test/test.js
    content = Fs.readFileSync( __dirname + Path.sep + 'fixture/test.js', 'utf8');
    content = content.replace(/#<projectName>/g, projectName);
    Fs.appendFileSync(Path.join(dir, 'test.js'), content);

    // - create and write test/<projectName>/test.js
    Fs.mkdirSync(Path.join(dir, projectName));
    content = Fs.readFileSync( __dirname + Path.sep + 'fixture/sample.js', 'utf8');
    content = content.replace(/#<projectName>/g, projectName);
    Fs.appendFileSync(Path.join(dir, projectName, 'sample.js'), content);

    // setting up root dir
    dir = process.cwd();
    // - write package.json
    content = Fs.readFileSync( __dirname + Path.sep + 'fixture/package.json', 'utf8');
    content = content.replace(/#<projectName>/g, projectName);
    Fs.appendFileSync(Path.join(dir, 'package.json'), content);
    // - write magellan.json
    content = Fs.readFileSync( __dirname + Path.sep + 'fixture/magellan.json', 'utf8');
    content = content.replace(/#<projectName>/g, projectName);
    Fs.appendFileSync(Path.join(dir, 'magellan.json'), content);

    // start npm install
    console.log('\nInstalling npm package...');
    var child = Exec('npm install bluecat chai config mocha testarmada-magellan@8.8.6 testarmada-magellan-mocha-plugin2 --save --loglevel silent --color always', function (error, stdout, stderr) {
      if (error !== null) {
        console.log('npm install failed: ' + error);
        console.log('Please try "' + argv.$0 + ' config" again');
      } else {
        console.log('\n================================================================');
        console.log('Basic test framework was created successfully!');
        console.log('To try your sample test, execute: \n\n\tnode_modules/.bin/mocha test/' + projectName);
        console.log('================================================================\n');
      }
    });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
} else if(argv._[0] === 'api') {
  var apiFilePath = Path.resolve() + Path.sep + 'config/api.json';

  if (!Fs.existsSync(apiFilePath)) {
    console.log(apiFilePath + ' doesn\'t exist');
    console.log('You need to define web services APIs in api.json first');
    process.exit(1);
  }

  var api = require(apiFilePath);

  var apis = [];
  var findPath = function(api, path){
    // check each of the attribute of the current 'api' object
    for(var i in api){
      if (api[i] !== null && typeof api[i] === 'object' && i !== 'method') {
        var p = path + '/' + i;
        if (api[i].hasOwnProperty('method')) {
          apis.push({
            method: api[i].method.join('|'),
            uri: p
          });
          findPath(api[i], p);
        } else {
          findPath(api[i], p);
        }
      }
    }
  };

  findPath(api, '');

  // remove the first section from all routes
  var apiRootName = Object.keys(api)[0];
  var newApis = [];
  for (var index in apis) {
    newApis.push({
      method: apis[index].method,
      uri: apis[index].uri.replace('/' + apiRootName, '')
    });
  }

  console.log('There are ' + newApis.length + ' API routes defined as follows:');
  console.log('-----------------------------------');
  console.log(Columnify(newApis));
}
