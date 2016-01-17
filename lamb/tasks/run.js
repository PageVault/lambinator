var chalk = require('chalk');

var run = function(func) {
  console.log('lambinator is running function:', func);
  
  //get function config
  var funcToRun = require(process.cwd() + '/functions/' + func + '/' + func);

  var context = {
    done: function(error, message) {
      if (error) {
        console.log(chalk.red('error running function'), error);
      }
      else {
        console.log(chalk.green('function ran and returned:'), message);
      }
      process.exit(1);
    },

    fail: function(error) {
      console.log(chalk.red('error running function'), error);
    }
  };

  var evt = {
    messageId: 'test-report-html'
  };

  funcToRun.handler(evt, context);
};

module.exports = run; 