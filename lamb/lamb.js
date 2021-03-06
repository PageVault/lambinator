#!/usr/bin/env node

var program = require('commander');
var chalk = require('chalk');
var tasks = require('require-dir')('./tasks');
var fs = require('fs');
var path = require('path');

var version = require(path.resolve(__dirname, '../package.json')).version;

var logHeader = function(func, env, details, next) {
  console.log(version);
  console.log(chalk.yellow.bold('<- λ -> '));
  console.log(chalk.yellow.bold('lambinator v' + version)
    + ((env) ? '   ' + chalk.blue.bold('env:', env) : '')
    + '   ' + chalk.red.bold(details + ' "' + func + '"'));
  console.log(chalk.yellow.bold('<- λ -> '));
  next();
};

program.version(version);

program
  .command('create <function-name>')
  .alias('new')
  .description('Creates a new Lambda function in /functions, including a function stub, lambinator.json file')
  .action(function (func) {
    logHeader(func, null, 'creating new function', function() { tasks.create(func); });
  });

program
  .command('run <function-name>')
  .alias('exec')
  .description('Run a function locally during development for testing, using a mock event described in lambinator.json')
  .option("-m, --mock [mockEvent]", "Which mock event to use")
  .option("-e, --env [settingsEnvironment]", "Which settings.json to use")
  .option("-d, --data [jsonData]", "JSON data to allow function to parse through process.argv")
  .action(function (func, options) {
    var testEvent = options.mock;
    var env = options.env || 'staging';
    logHeader(func, env, 'running function locally', function() { tasks.exec(func, env, {action: 'run', testEvent: testEvent}); });
  });

program
  .command('deploy <function-name>')
  .description('Deploy a function to AWS Lambda, specifying an environment/version prefix')
  .option("-e, --env [environment]", "Which environment to deploy to")
  .action(function (func, options) {
    var env = options.env || 'staging';
    logHeader(func, env, 'deploying function', function() { tasks.exec(func, env, { action: 'deploy'}); });
  });

program
  .command('zip <function-name>')
  .alias('bundle')
  .description('Zip a function for deployment to AWS Lambda manually')
  .option("-e, --env [environment]", "Which environment to deploy to")
  .option("-l, --local-node-modules", "Uses cached node_modules instead of `npm install`")
  .action(function (func, options) {
    var env = options.env || 'staging';
    logHeader(func, env, 'zipping function', function() { tasks.exec(func, env, { action: 'zip', localNodeModules: options.localNodeModules }); });
  });

program
  .command('upload <function-name>')
  .description('Uploads a packaged/zipped function to AWS Lambda, specifying an environment/version prefix')
  .option("-e, --env [environment]", "Which environment to deploy to")
  .action(function (func, options) {
    var env = options.env || 'staging';
    logHeader(func, env, 'deploying function', function() { tasks.exec(func, env, { action: 'upload'}); });
  });

program
  .command('*')
  .action(function(env){
    program.outputHelp();
  });

program.parse(process.argv);
