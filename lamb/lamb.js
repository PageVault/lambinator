#!/usr/bin/env node

var packageJson = require(process.cwd() + '/package.json')
  , commander   = require('commander')
  , chalk       = require('chalk')
  , tasks       = require('require-dir')('./tasks')
  , pkg         = require(process.cwd() + '/package.json')
  ;


var logHeader = function(command) {
  console.log(chalk.yellow.bold('<-λ-> lambinator v' + pkg.version));
};


commander
  .version(packageJson.version);

commander
  .command('new <function-name>')
  .description('Creates a new Lambda function in /functions, including a function stub, lambinator.json file, and .env.sample file')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('creating new function: '), func);
    tasks.newFunc(func);
  });

commander
  .command('run <function-name> [test-event]')
  .description('Run a function locally during development for testing, using a mock event described in lambinator.json')
  .action(function (func, testEvent) {
    logHeader();
    console.log(chalk.white.bold('running function: '), func);
    tasks.run(func, testEvent);
  });

commander
  .command('deploy <function-name> <environment>')
  .description('Deploy a function to AWS Lambda, specifying an environment/version prefix')
  .action(function (func, env) {
    logHeader();
    if (!env) env = 'staging';
    console.log(chalk.white.bold('deploying function: '), func, chalk.white.bold('to environment:'), env);
    tasks.deploy(func, env);
  });

commander
  .command('zip <function-name> <environment>')
  .description('Zip a function for deployment to AWS Lambda manually')
  .action(function (func, env) {
    logHeader();
    console.log(chalk.yellow('env: ' + env));
    console.log(chalk.white.bold('deploying function: '), func, chalk.white.bold('to environment:'), env);
    tasks.zip(func, env);
  });


commander
  .command('list')
  .description('Lists functions registered in the Lambinator Function Registry')
  .action(function () {
    logHeader();
    console.log(chalk.white.bold('listing registered functions...'));
    tasks.list();
  });

commander
  .command('install <function-name>')
  .description('Installs a function by name from the registry for local editing and eventual deployment')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('installing function:'), func);
    tasks.install(func);
  });


commander.parse(process.argv);
