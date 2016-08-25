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
    startTime: new Date(),
    timeout: 300000, //for test purposes, timeout after 10s

    done: function(error, data) {
      if (error) {
        console.log(chalk.red('error running function'), error);
        process.exit(1);
      }
      else {
        console.log(chalk.green('function ran and returned:'), data);
        process.exit(0);
      }
    },

    fail: function(error) {
      console.log(chalk.red('error running function'), error);
      process.exit(1);
    },

    succeed: function (data) {
      console.log(chalk.green('function ran and returned:'), data);
      process.exit(1);
    },

    getRemainingTimeInMillis: function () {
      return this.timeout - ((new Date) - this.startTime);
    }
  };

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

  //copy env file to .env
  var envFile = process.cwd() + '/.env.' + env;
  gutil.log('envFile', envFile);
  if (fs.existsSync(envFile)) {
    var runtimeEnvFile = path.join(process.cwd(), '.env');
    gutil.log('Copying env file:', envFile, runtimeEnvFile);
    fs.copySync(envFile, runtimeEnvFile, { clobber: true });
  }

  //custom script?
  if (funcData.customScript) {
    try {
      //call custom script and pass in mock context
      console.log('working dir:', process.cwd());
      var reqScript = process.cwd() + '/' + funcData.customScript;
      console.log('requiring script:', reqScript);
      require(reqScript)(context);
    }
    catch(err) {
      context.fail(err);
    }
  }
  else {
    //get mock event
    var evt = funcData.testEvents[testEvent || funcData.defaultEvent];
    if (!evt) {
      console.log('Could not find a mock event named "' + (testEvent || funcData.defaultEvent) + '"');
      process.exit();
    }
    gutil.log('mock event:', evt);

    //spin it up using mock event
    gutil.log('running function...');
    try {
      var funcToRun = require(process.cwd() + '/' + func);
      funcToRun.handler(evt, context);
    }
    catch (err) {
      gutil.log('error running function', err);
    }
  }

};

module.exports = run;
