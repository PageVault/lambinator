var chalk = require('chalk');
var fs    = require('fs-extra');
var path  = require('path');
var gutil = require('gulp-util');
var startTime = new Date();
var timeout; 

var run = function (func, testEvent, testEnv) {
  var folderPath = path.join(process.cwd(), '/functions', '/' + func);
  var data = JSON.parse(fs.readFileSync(path.join(folderPath, 'lambinator.json'), {encoding:'utf-8'}));
  timeout = data.timeout ? (data.timeout * 1000) : 300000;

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
      return timeout - ((new Date) - startTime);
    }
  };

  //copy settings file to settings.json
  var env = testEnv || funcData.defaultEnv || "staging";
  var settingsFile =  process.cwd() + '/settings-' + env + '.json';
  //settings
  if (fs.existsSync(settingsFile)) {
    //read settings file for environment
    var s = JSON.parse(fs.readFileSync(settingsFile, {encoding:'utf8'}));
    //add "env"
    s.env = env;
    //write to settings.json
    gutil.log('write settings-' + env + '.json to settings.json');
    fs.writeFileSync(path.join(process.cwd(), 'settings.json'), JSON.stringify(s, null, 2), {encoding: 'utf8'});
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
      funcToRun.handler(evt, context, context.done);
    }
    catch (err) {
      gutil.log('error running function', err);
    }
  }

};

module.exports = run;
