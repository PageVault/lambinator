var chalk = require('chalk')
  , fs    = require('fs-extra')
  , path  = require('path')
  ;

var run = function(func, testEvent, testEnv) {

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

  //get mock event
  var evt = funcData.testEvents[testEvent || funcData.defaultEvent];

  //copy settings file to settings.json
  var env = testEnv || funcData.defaultEnv;
  if (env) {
    var settingsFile =  process.cwd() + '/functions/' + func + '/settings-' + env + '.json';
    // console.log('env', env);
    // console.log('settingsFile', settingsFile);
    if (fs.existsSync(settingsFile)) {
      fs.copySync(settingsFile, path.join(process.cwd(), 'settings.json'), { clobber: true });
    }
  }

  //spin it up!
  funcToRun.handler(evt, context);
};

module.exports = run;