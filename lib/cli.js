// Bluecat client command line tool
// used for setup basic test framework scaffold

var Fs = require('fs');
var Path = require('path');
var Inquirer = require('inquirer');
var Exec = require('child_process').exec;
var argv = require('yargs')
  .usage('Usage: $0 <config|api>')
  .demand(1)
  .argv;

var questions = [
  {
    type: 'input',
    name: 'project_name',
    message: 'What\'s the name of your project',
    //default: 'Service test'
  }
];

if(argv._[0] === 'config') {
  console.log('\n===========================================');
  console.log('Bluecat Test Framework Configuration Helper');
  console.log('===========================================\n');

  Inquirer.prompt( questions, function( answers ) {
    // console.log( JSON.stringify(answers, null, '  ') );

    // setting up config dir
    var dir = Path.join(process.cwd(), 'config');
    if (!Fs.existsSync(dir)){
      Fs.mkdirSync(dir);
    }
    var content = {};
    content[answers.project_name] = {
      get:{
        schema: "http",
        method: ["GET"],
      },
      post:{
        schema: "http",
        method: ["POST"],
      }
    };
    Fs.appendFileSync(Path.join(dir, 'api.json'), JSON.stringify(content, null, 2) + ',\n');

    content = {
      env: "production",
      proxy: null,
      server: {
        host: "http://httpbin.org/",
      }
    };
    Fs.appendFileSync(Path.join(dir, 'default.json'), JSON.stringify(content, null, 2) + ',\n');

    // setting up test dir
    dir = Path.join(process.cwd(), 'test');
    if (!Fs.existsSync(dir)){
      Fs.mkdirSync(dir);
    }
    var testContent = `
var Config = require('config');
var Bluecat = require('bluecat');

var api = Bluecat.Api('pangaea');

service = new Bluecat.ServiceSync(api, Config.server.host);
service.setProxy(Config.proxy);
exports.${answers.project_name} = service;
`;
    Fs.appendFileSync(Path.join(dir, 'test.js'), JSON.stringify(content, null, 2) + ',\n');

    // setting up root dir
    var content = {
      name: answers.project_name,
      version: '0.0.1',
      dependencies: {
      }
    };
    Fs.appendFileSync(Path.join(process.cwd(), 'package.json'), JSON.stringify(conntent, null, 2) + ',\n');
    var output = Exec('npm install bluecat chai config mocha mocha-espresso mocha-multi --save');
  });
}

