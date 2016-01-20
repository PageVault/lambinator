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
  .version(packageJson.version)
  .command('new <function-name>')
  .description('Initialize needed assets for describing lambda functions')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('creating new function: '), func);
    tasks.newFunc(func);
  });

commander
  .version(packageJson.version)
  .command('run <function-name>')
  .description('Run a function locally during development for testing, using a mock event described in lambinator.json')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('running function: '), func);
    tasks.run(func);
  });

commander
  .version(packageJson.version)
  .command('deploy <function-name> <environment>')
  .description('Deploy a function to AWS Lambda, specifying an environment/version prefix')
  .action(function (func, env) {
    logHeader();
    console.log(chalk.white.bold('deploying function: '), func, chalk.white.bold('to environment:'), env);
    tasks.deploy(func, env);
  });

commander
  .version(packageJson.version)
  .command('zip <function-name>')
  .description('Zip a function for deployment to AWS Lambda manually')
  .action(function (func, env) {
    logHeader();
    console.log(chalk.white.bold('deploying function: '), func, chalk.white.bold('to environment:'), env);
    tasks.zip(func, 'zip');
  });


commander
  .version(packageJson.version)
  .command('list')
  .description('Lists functions registered in the Lambinator Function Registry')
  .action(function () {
    logHeader();
    console.log(chalk.white.bold('listing registered functions...'));
    tasks.list();
  });

commander
  .version(packageJson.version)
  .command('install <function-name>')
  .description('Installs a function by name from the registry for local editing and eventual deployment')
  .action(function (func) {
    logHeader();
    console.log(chalk.white.bold('installing function:'), func);
    tasks.install(func);
  });


commander.parse(process.argv);
