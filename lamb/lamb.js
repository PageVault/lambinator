#!/usr/bin/env node

var packageJson = require(process.cwd() + '/package.json')
  , program     = require('commander')
  , chalk       = require('chalk')
  , tasks       = require('require-dir')('./tasks')
  , pkg         = require(process.cwd() + '/package.json')
  ;


var logHeader = function(func, env, details) {
  console.log(chalk.yellow.bold('<- λ -> '));
  console.log(chalk.yellow.bold('lambinator v' + pkg.version)
    + ((env) ? '   ' + chalk.blue.bold('env:', env) : '')
    + '   ' + chalk.red.bold(details + ' "' + func + '"'));
  console.log(chalk.yellow.bold('<- λ -> '));
};


program
  .version(packageJson.version);

program
  .command('create <function-name>')
  .description('Creates a new Lambda function in /functions, including a function stub, lambinator.json file, and .env.sample file')
  .action(function (func) {
    logHeader(func, null, 'creating new function');
    tasks.create(func);
  });

program
  .command('run <function-name>')
  .description('Run a function locally during development for testing, using a mock event described in lambinator.json')
  .option("-m, --mock [mockEvent]", "Which mock event to use")
  .option("-e, --env [settingsEnvironment]", "Which settings.json to use")
  .action(function (func, options) {
    var testEvent = options.mock;
    var env = options.env;
    logHeader(func, env, 'running function locally');
    tasks.run(func, testEvent, env);
  });

program
  .command('deploy <function-name>')
  .description('Deploy a function to AWS Lambda, specifying an environment/version prefix')
  .option("-e, --env [environment]", "Which environment to deploy to")
  .action(function (func, options) {
    var env = options.env || 'staging';
    logHeader(func, env, 'deploying function');
    tasks.deploy(func, env);
  });

program
  .command('zip <function-name>')
  .description('Zip a function for deployment to AWS Lambda manually')
  .option("-e, --env [environment]", "Which environment to deploy to")
  .action(function (func, options) {
    var env = options.env || 'staging';
    logHeader(func, env, 'zipping function');
    tasks.zip(func, env);
  });

/*
program
  .command('list')
  .description('Lists functions registered in the Lambinator Function Registry')
  .action(function () {
    logHeader();
    console.log(chalk.white.bold('listing registered functions...'));
    tasks.list();
  });

program
  .command('install <function-name>')
  .description('Installs a function by name from the registry for local editing and eventual deployment')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('installing function:'), func);
    tasks.install(func);
  });
*/

program.parse(process.argv);
