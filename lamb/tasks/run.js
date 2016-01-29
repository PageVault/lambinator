var chalk = require('chalk');

var run = function(func, testEvent) {
  console.log('lambinator is running function:', func);

  //get function config
  var funcToRun = require(process.cwd() + '/functions/' + func + '/' + func);
  var funcData =  require(process.cwd() + '/functions/' + func + '/lambinator.json');

  var context = {
    done: function(error, data) {
      if (error) {
        console.log(chalk.red('error running function'), error);
      }
      else {
        console.log(chalk.green('function ran and returned:'), data);
      }
      process.exit(1);
    },

    fail: function(error) {
      console.log(chalk.red('error running function'), error);
    },
    succeed: function(data) {
      console.log(chalk.green('function ran and returned:'), data);
      process.exit(1);
    }
  };


  var evt = funcData.testEvents[testEvent || funcData.defaultEvent];

  funcToRun.handler(evt, context);
};

module.exports = run;