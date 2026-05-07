'use strict';

/*
  Bluecat CLI:
    bluecat config            Scaffold a new test framework in cwd
    bluecat api               List API routes defined in config/api.json
    bluecat openapi <path>    Convert an OpenAPI 3 spec to config/api.json
*/

const Fs = require('fs');
const Path = require('path');
const { execSync } = require('child_process');
const Columnify = require('columnify');
const Yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const validateApi = require('../validate-api');
const { fromOpenAPI, hostFromOpenAPI } = require('../openapi');

const argv = Yargs(hideBin(process.argv))
  .usage('Usage: $0 <config|api|openapi> [options]')
  .command('config', 'Scaffold a new Bluecat-based test framework')
  .command('api', 'List API routes defined in config/api.json')
  .command('openapi <spec>', 'Convert an OpenAPI 3 spec to config/api.json')
  .demandCommand(1)
  .help()
  .argv;

const cmd = argv._[0];

if (cmd === 'config') {
  scaffoldConfig().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
} else if (cmd === 'api') {
  listApis();
} else if (cmd === 'openapi') {
  convertOpenAPI(argv.spec || argv._[1]);
} else {
  console.error('Unknown command: ' + cmd);
  process.exit(1);
}

async function scaffoldConfig() {
  const Inquirer = require('inquirer');
  const prompt = Inquirer.default ? Inquirer.default.prompt : Inquirer.prompt;

  console.log('\n===========================================');
  console.log('Bluecat Test Framework Configuration Helper');
  console.log('===========================================\n');

  const answers = await prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (one word, no digits or special characters)',
      validate: v => /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(v) || 'Please enter a valid project name'
    },
    {
      type: 'confirm',
      name: 'toContinue',
      message: 'This will create a basic test scaffold in the current directory and run npm install. Continue?',
      default: true
    }
  ]);

  if (!answers.toContinue) process.exit(0);
  const projectName = answers.projectName.toLowerCase();

  const fixtureDir = Path.join(__dirname, 'fixture');
  const cwd = process.cwd();

  function copyTemplate(srcRel, destRel) {
    const src = Path.join(fixtureDir, srcRel);
    const dest = Path.join(cwd, destRel);
    let content = Fs.readFileSync(src, 'utf8').replace(/#<projectName>/g, projectName);
    Fs.mkdirSync(Path.dirname(dest), { recursive: true });
    Fs.writeFileSync(dest, content);
  }

  copyTemplate('api.json', 'config/api.json');
  copyTemplate('default.json', 'config/default.json');
  copyTemplate('test.js', 'test/test.js');
  copyTemplate('sample.js', `test/${projectName}/sample.test.js`);
  copyTemplate('package.json', 'package.json');
  copyTemplate('mocharc.json', '.mocharc.json');

  console.log('\nInstalling npm packages (this may take a minute)...');
  try {
    execSync('npm install bluecat chai@^4 config@^3 mocha@^10 --save --loglevel=warn', {
      cwd,
      stdio: 'inherit'
    });
  } catch (e) {
    console.error('npm install failed: ' + e.message);
    console.error('Please run "npm install" manually.');
    return;
  }

  console.log('\n================================================================');
  console.log('Basic test framework was created successfully!');
  console.log('To try your sample test, execute:');
  console.log('\n\tnpx mocha test/' + projectName);
  console.log('\nFor parallel execution use:');
  console.log('\n\tnpx mocha --parallel test/' + projectName);
  console.log('================================================================\n');
}

function listApis() {
  const apiFilePath = Path.join(Path.resolve(), 'config', 'api.json');
  if (!Fs.existsSync(apiFilePath)) {
    console.error(apiFilePath + ' does not exist');
    console.error('You need to define web service APIs in config/api.json first');
    process.exit(1);
  }

  const api = require(apiFilePath);
  validateApi(api);

  const apis = [];
  function findPath(node, path) {
    for (const key in node) {
      if (key === 'method' || key === 'host' || key === 'headers' ||
          key === 'schema' || key === 'query') continue;
      if (node[key] !== null && typeof node[key] === 'object') {
        const p = path + '/' + key;
        if (Object.prototype.hasOwnProperty.call(node[key], 'method')) {
          apis.push({ method: node[key].method.join('|'), uri: p });
        }
        findPath(node[key], p);
      }
    }
  }
  findPath(api, '');

  const apiRootName = Object.keys(api)[0];
  const newApis = apis.map(a => ({
    method: a.method,
    uri: a.uri.replace('/' + apiRootName, '')
  }));

  console.log(`There are ${newApis.length} API routes defined as follows:`);
  console.log('-----------------------------------');
  console.log(Columnify(newApis));
}

function convertOpenAPI(specPath) {
  if (!specPath) {
    console.error('Usage: bluecat openapi <path-to-spec.json|.yaml>');
    process.exit(1);
  }
  const abs = Path.resolve(specPath);
  if (!Fs.existsSync(abs)) {
    console.error(`Spec file not found: ${abs}`);
    process.exit(1);
  }

  let spec;
  const text = Fs.readFileSync(abs, 'utf8');
  if (abs.endsWith('.yaml') || abs.endsWith('.yml')) {
    try {
      spec = require('yaml').parse(text);
    } catch (_e) {
      console.error('YAML support requires the optional "yaml" package: npm install yaml');
      process.exit(1);
    }
  } else {
    spec = JSON.parse(text);
  }

  const tree = fromOpenAPI(spec);
  const host = hostFromOpenAPI(spec);

  const outDir = Path.join(process.cwd(), 'config');
  Fs.mkdirSync(outDir, { recursive: true });
  const outPath = Path.join(outDir, 'api.json');
  Fs.writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n');

  console.log(`Wrote ${outPath}`);
  if (host) console.log(`Suggested host: ${host}`);
}
