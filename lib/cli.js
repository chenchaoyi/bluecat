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
    message: 'This will create a basic test structure in current directory and install nessasary npm packages locally. Are you sure to continue',
    default: true
  }
];

if(argv._[0] === 'config') {
  console.log('\n===========================================');
  console.log('Bluecat Test Framework Configuration Helper');
  console.log('===========================================\n');

  Inquirer.prompt( questions, function( answers ) {
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
    var content = {};
    content[projectName] = {
      get:{
        schema: "http",
        method: ["GET"],
      },
      post:{
        schema: "http",
        method: ["POST"],
      }
    };
    Fs.appendFileSync(Path.join(dir, 'api.json'), JSON.stringify(content, null, 2));

    content = {
      env: "production",
      proxy: null,
      server: {
        host: "httpbin.org",
      }
    };
    Fs.appendFileSync(Path.join(dir, 'default.json'), JSON.stringify(content, null, 2));

    // setting up test dir
    dir = Path.join(process.cwd(), 'test');
    if (!Fs.existsSync(dir)){
      Fs.mkdirSync(dir);
    }
    var testContent = `
var Config = require('config');
var Bluecat = require('bluecat');

var api = Bluecat.Api('${projectName}');

service = new Bluecat.ServiceSync(api, Config.server.host);
service.setProxy(Config.proxy);
exports.${projectName} = service;
`;
    Fs.appendFileSync(Path.join(dir, 'test.js'), testContent);
    Fs.mkdirSync(Path.join(dir, projectName));
    testContent = `
// Sample test suite utilizing Bluecat

var expect = require('chai').expect;
var test = require('../../test/test.js');

describe('Sample test suite', function() {
  before(function() {
    service = test.${projectName};
  });

  it('sample test to get endpoint [C001]', function(done) {
    service.run(function() {
      var r = service.get.GET({});
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).is.a('object');
      expect(r.data.body.url).to.equal('http://httpbin.org/get');
      done();
    });
  });

  it('sample test to post endpoint [C002]', function(done) {
    service.run(function() {
      var payload = {
        sample: {
          addressLineOne: '755 abc Ave',
          city: 'Albany'
        }
      };

      var r = service.post.POST({
        body: payload
      });
      expect(r.data.statusCode).to.equal(200);
      expect(r.data.body).is.a('object');
      expect(r.data.body.json.sample.city).to.equal('Albany');
      done();
    });
  });

});
`
    Fs.appendFileSync(Path.join(dir, projectName, 'sample.js'), testContent);

    // setting up root dir
    var content = {
      name: projectName,
      version: '0.0.1',
      dependencies: {
      }
    };
    Fs.appendFileSync(Path.join(process.cwd(), 'package.json'), JSON.stringify(content, null, 2));
    console.log('\nInstalling npm package...');
    Exec('npm install bluecat chai config mocha mocha-espresso mocha-multi --save', function (error, stdout, stderr) {
      if (error !== null) {
        console.log('npm install failed: ' + error);
      } else {
        console.log('\n================================================================');
        console.log('Basic test framework was created successfully!');
        console.log(`To try your sample test, execute: \n\n\tnode_modules/.bin/mocha test/${projectName}`);
        console.log('================================================================\n');
      }
    });
  });
}

