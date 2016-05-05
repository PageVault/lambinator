var chalk = require('chalk')
  , fs    = require('fs-extra')
  , path  = require('path')
  , gutil = require('gulp-util')
  ;

var run = function (func, testEvent, testEnv) {
  //change working directory
  var funcDir = process.cwd() + '/functions/' + func;
  if (!fs.existsSync(funcDir)) {
    console.log('Could not find a function to run at:', funcDir);
    console.log('Make sure you are using `lamb run` from your project root directory.');
    process.exit();
  }

  console.log('Changing working directory to:', funcDir);
  process.chdir(funcDir);

  //get function config
  var funcData =  require(process.cwd() + '/lambinator.json');

  //mock context
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
  gutil.log('evt', evt);


  //copy settings file to settings.json
  var env = testEnv || funcData.defaultEnv || "staging";
  var settingsFile =  process.cwd() + '/settings-' + env + '.json';
  // console.log('env', env);
  gutil.log('settingsFile', settingsFile);
  if (fs.existsSync(settingsFile)) {
    var runtimeSettingsFile = path.join(process.cwd(), 'settings.json');
    gutil.log('Copying settings file:', settingsFile, runtimeSettingsFile);
    fs.copySync(settingsFile, runtimeSettingsFile, { clobber: true });
  }

  //spin it up!
  var funcToRun = require(process.cwd() + '/' + func);
  funcToRun.handler(evt, context);
};

module.exports = run;
