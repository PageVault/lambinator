#!/usr/bin/env node

var packageJson = require(process.cwd() + '/package.json')
  , commander   = require('commander')
  , chalk       = require('chalk')
  , tasks       = require('require-dir')('./tasks')
  ; 


// var AWS_ENVIRONMENT = process.env.AWS_ENVIRONMENT || '';
// var CONFIG_FILE = process.env.CONFIG_FILE || '';
// var AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'missing';
// var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'missing';
// var AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || '';
// var AWS_REGION = process.env.AWS_REGION || 'us-east-1,us-west-2,eu-west-1';
// var AWS_FUNCTION_NAME = process.env.AWS_FUNCTION_NAME || packageJson.name;
// var AWS_HANDLER = process.env.AWS_HANDLER || 'index.handler';
// var AWS_MODE = 'event';
// var AWS_ROLE = process.env.AWS_ROLE_ARN || process.env.AWS_ROLE || 'missing';
// var AWS_MEMORY_SIZE = process.env.AWS_MEMORY_SIZE || 128;
// var AWS_TIMEOUT = process.env.AWS_TIMEOUT || 60;
// var AWS_DESCRIPTION = process.env.AWS_DESCRIPTION || '';
// var AWS_RUNTIME = process.env.AWS_RUNTIME || 'nodejs';
// var AWS_FUNCTION_VERSION = process.env.AWS_FUNCTION_VERSION || '';
// var EVENT_FILE = process.env.EVENT_FILE || 'event.json';

commander
  .version(packageJson.version)
  .command('new <function-name>')
  .description('Initialize needed assets for describing lambda functions')
  .action(function (func) {
    console.log('new');
    tasks.newFunc(func);
  });

commander
  .version(packageJson.version)
  .command('run <function-name>')
  .description('Run a function locally during development for testing, using a mock event described in lambinator.json')
  .action(function (func) {
    console.log('run ' + func);
    tasks.run(func);
  });

commander
  .version(packageJson.version)
  .command('deploy <function-name> <environment>')
  .description('Deploy a function to AWS Lambda, specifying an environment/version prefix')
  .action(function (func, env) {
    console.log('deploy ' + func + ' ' + env);
    tasks.deploy(func, env);
  });

commander
  .version(packageJson.version)
  .command('list')
  .description('Lists functions registered in the Lambinator Function Registry')
  .action(function () {
    console.log('list');
    tasks.list();
  });

commander
  .version(packageJson.version)
  .command('get <function-name>')
  .description('Get a function by name from the registry for local editing and eventual deployment')
  .action(function (func) {
    console.log('get ' + func);
    tasks.get(func);
  });


commander.parse(process.argv);
