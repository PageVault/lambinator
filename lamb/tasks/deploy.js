'use strict';

const AWS          = require('aws-sdk');
const fs           = require('fs-extra');
const path         = require('path');
const async        = require('async');
const chalk        = require('chalk');
const ncp          = require('ncp');
const recursive    = require('recursive-readdir');
const gulp         = require('gulp');
const install      = require('gulp-install');
const fancy        = require('fancy-log');
const next         = require('gulp-next');
const pkg          = require(process.cwd() + '/package.json');
const spawn        = require('child_process').spawn;
const Promise      = require('bluebird');
const glob         = require('glob');
const babel        = require('babel-core');

let data = {
  folderPath: null,   //e.g. ./functions/hello-world
  distPath: null,     //e.g. ./dist/hello-world
  environment: null   //e.g. staging
};


let clean = (callback) => {
  fancy.info('clean...');

  fs.remove(path.join(process.cwd(), 'dist'), (err) => {
    if (err) return callback(err);
    fs.ensureDir(data.distPath, (err) => callback(err));
  });
};

// let prep = (callback) => {
//   gutil.log('prep...');
//   fs.ensureDir(data.distPath, function(err) { callback(err); });
//   gutil.log('creating package.json for installing package dependencies...');
//   let pkg = require(path.join(process.cwd(), 'package.json'));
//   let re = /require\(["'].*["']\)/g;
//   let functionFile = path.join(data.folderPath, data.functionName + '.js');
//   let text = fs.readFileSync(functionFile, {encoding:'utf-8'});
//   let reqs = text.match(re);
//   let dependencies = {};

//   reqs.forEach(function (r) {
//     let m = r.replace(/\'/g, '').replace(/\"/g, '').replace('require(', '').replace(')', '');
//     if (pkg.dependencies[m]) {
//       dependencies[m] = pkg.dependencies[m];
//     }
//   });

//   let packagePath = path.join(data.distPath, 'package.json');
//   let packages = {dependencies: dependencies};
//   fs.writeFile(packagePath, JSON.stringify(packages, null, 2), callback);
// };

// let yarn = (callback) => {
//   let y = spawn('yarn');

//   y.stdout.on('data', (data) => {
//     gutil.log(data.toString());
//   });

//   y.stderr.on('err', (err) => {
//     callback(err);
//   });

//   y.on('close', (code) => {
//     // let tsHash = tsData.toString();
//     // console.log('tsHash', tsHash);
//     callback(null);
//   });
// };

let npm = (callback) => {
  fancy.info('npm...');

  if (data.localNodeModules) {
    fancy.info('copying NPM modules for deployment...');
    fs.copySync(
      path.join(process.cwd(), 'node_modules'),
      path.join(data.distPath, 'node_modules')
    );
    callback(null);
  }
  else {
    fancy.info('...creating package.json for installing package dependencies...');
    let pkg = require(path.join(process.cwd(), 'package.json'));
    // search for `require` statements in function file to determine what packages are needed at runtime
    let re = /require\(["'].*["']\)/g;
    let functionFile = path.join(data.folderPath, data.functionName + '.js');
    let text = fs.readFileSync(functionFile, {encoding:'utf-8'});
    let reqs = text.match(re);
    let dependencies = {};

    reqs.forEach(function (r) {
      let m = r.replace(/\'/g, '').replace(/\"/g, '').replace('require(', '').replace(')', '');
      if (pkg.dependencies[m]) {
        dependencies[m] = pkg.dependencies[m];
      }
    });

    fs.ensureDirSync(data.distPath);
    let packagePath = path.join(data.distPath, 'package.json');
    let packages = {dependencies: dependencies};
    fs.writeFileSync(packagePath, JSON.stringify(packages, null, 2));
    fancy.info('installing function packages from NPM...');
    return gulp.src(packagePath)
      .pipe(install({ production: true }))
      .pipe(next(function() {
        callback(null);
      }));
  }
};

let envFile = (callback) => {
  fancy.info('checking for .env file for:', data.environment);
  //concat environment specific .env file if there is one
  let targetedEnv = path.join(data.folderPath, '.env.' + data.environment);
  let finalEnv = path.join(data.distPath, '.env');
  let hasTargetedEnv = fs.existsSync(targetedEnv);

  if (!hasTargetedEnv) {
    fancy.info('no .env found for ' + data.environment);
    return callback(null);
  }
  else {
    fancy.info('found .env.' + data.environment);
    fs.copy(targetedEnv, finalEnv, callback);
    // fs.createReadStream(targetedEnv).pipe(fs.createWriteStream(finalEnv));
    // callback(null);
  }
};

let copyFiles = (callback) => {
  fancy.info('copyFiles...');

  if (!data.dependencies) return callback(null);

  data.globs = [];
  

  for(let dependency of data.dependencies) {

    let functionDependency = path.join(data.folderPath, dependency);
    let globalDependency = path.join(data.globalDependenciesDir, dependency);

    if (glob.hasMagic(dependency)) {
      data.globs.push(dependency);
    }
    else {
      //look in function directory for file
      if (fs.existsSync(functionDependency)) {
        fancy.info('Using locally provided dependency:', functionDependency);
        fs.copySync(functionDependency, path.join(data.distPath, dependency));
      }
      //look in global dependencies folder
      else if (fs.existsSync(globalDependency)) {
        fancy.info('Using global dependency:', globalDependency);
        fs.copySync(globalDependency, path.join(data.distPath, dependency));
      }
    }
  }

  callback(null);
};


let processGlobs = (callback) => {
  fancy.info('processGlobs...');

  async.each(data.globs, (spec, globCallback) => {

    let functionDependency = path.join(data.folderPath, spec);
    let globalDependency = path.join(data.globalDependenciesDir, spec);

    glob(functionDependency, (err, matches) => {
      if (err) return globCallback(err);

      //for each file found in the glob...
      async.each(matches, (match, matchesCallback) => {

        fs.lstat(match, (err, stat) => {
          if (err) return matchesCallback(err);

          if (stat.isFile()) {
            let targetPath = path.join(data.distPath, match.replace(data.folderPath, ''));
            fs.ensureDir(path.dirname(targetPath), (err) => {
              if (err) return matchesCallback(err);

              fancy.info(targetPath);
              fs.copy(match, targetPath, matchesCallback);
            });
          }
          else {
            matchesCallback();
          }

        });

      }, (err) => {
        if (err) globCallback(err);
        else globCallback();
      });

    });

  }, (err) => {
    if (err) callback(err);
    else callback(null);
  });
};

let copyFunction = (callback) => {
  fancy.info('copyFunction...');

  let functionFile = path.join(data.folderPath, data.functionName + '.js');
  let outputFile = path.join(data.distPath, data.functionName + '.js');

  // transform function
  if(data.runtime == 'babel-nodejs6.10') {
    data.runDir = data.distPath;
    // let output = babel.transformFileSync(functionFile, {plugins: ["transform-async-to-generator"]}).code;
    let output = babel.transformFileSync(functionFile, {
      presets: [
        ["env", {
          "targets": {
            "node": ["6.10"]
          }
        }]
      ]
    }).code;
    
    fs.writeFileSync(outputFile, output, {encoding: 'utf-8'});
    data.runtime = 'nodejs6.10';
  }
  else {
    data.runDir = data.folderPath;
    // copy function itself
    fancy.info('copying function:', functionFile);
    fs.copySync(functionFile, outputFile);
  }
    
  //settings
  let settingsFile =  data.folderPath + '/settings';
  if (!data.envPrefixes) settingsFile += '.json';
  else settingsFile += '-' + data.environment + '.json'; 
  fancy.info('settings file:', settingsFile);

  if (fs.existsSync(settingsFile)) {
    //read settings file for environment
    let s = JSON.parse(fs.readFileSync(settingsFile, {encoding:'utf8'}));
    //add "env"
    s.env = data.environment;
    //write to settings.json
    fancy.info('write settings-' + data.environment + '.json to settings.json');
    fs.writeFileSync(path.join(data.runDir, 'settings.json'), JSON.stringify(s, null, 2), {encoding: 'utf8'});
    fs.writeFileSync(path.join(data.distPath, 'settings.json'), JSON.stringify(s, null, 2), {encoding: 'utf8'});
  }

  callback(null);
};




let zipFiles = (callback) => {
  fancy.info('zipFiles...');

  if (process.platform !== 'win32') {
    //use native zip
    let cmd = 'zip -r ' + data.distPath + '.zip' + ' .';
    let exec = require('child_process').exec;

    exec(cmd, {
      cwd: data.distPath,
      maxBuffer: 50 * 1024 * 1024
    }, function (err) {
      if (err) return callback(err);
      else return callback(null);
    });
  }
  else {
    //use npm lib for zipping
    // NODE-ZIP
    let zip = new require('node-zip')();
    let search = data.distPath;
    recursive(search, function(err, files) {

      files.forEach(function(file) {
        let path = file.substring(file.indexOf(search) + search.length + 1);
        if (fs.lstatSync(file).isFile()) {
          zip.file(path, fs.readFileSync(file));
        }
      });

      let buffer = zip.generate({type: 'nodebuffer', compression: 'DEFLATE'});

      fs.writeFile(data.distPath + '.zip', buffer, function(err) {
        if (err) callback(err)
        else callback(null);
      });

    });

  }
};

let runFunction = (callback) => {
  fancy.info('runFunction...');

  var startTime = new Date();
  var timeout; 
  
  var functionFile = path.join(data.distPath, data.functionName + '.js');
  if (!fs.existsSync(functionFile)) {
    console.log('Could not find function:', functionFile);
    console.log('Make sure you are using `lamb run` from your project root directory.');
    process.exit();
  }

  var funcData = require(path.join(data.folderPath, 'lambinator.json'));
  timeout = funcData.timeout ? (funcData.timeout * 1000) : 300000;

  //change working directory
  if (!fs.existsSync(data.distPath)) {
    console.log('Could not find a function to run at:', data.distPath);
    console.log('Make sure you are using `lamb run` from your project root directory.');
    process.exit();
  }

  console.log('Changing working directory to:', data.runDir);
  process.chdir(data.runDir);

  //set env for lambinator
  process.env.lambinator = true;

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
      process.exit(0);
    },

    getRemainingTimeInMillis: function () {
      return timeout - ((new Date) - startTime);
    }
  };

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
    var evt = funcData.testEvents[data.testEvent || funcData.defaultEvent];
    if (!evt) {
      console.log('Could not find a mock event named "' + (testEvent || funcData.defaultEvent) + '"');
      process.exit();
    }
    fancy.info('mock event:', evt);

    //spin it up using mock event
    fancy.info('running function...');
    try {
      var funcToRun = require(process.cwd() + '/' + data.functionName);
      funcToRun.handler(evt, context, context.done);
    }
    catch (err) {
      fancy.info(chalk.red('error running function'));
      console.log();
      console.log((err.stack) ? err.stack : err.toString());
      console.log();
    }
  }
}

let upload = (callback) => {
  fancy.info('upload...');

  //set region from lambinator.config:region
  AWS.config.update({region:data.region});
  AWS.config.apiVersions = {lambda: '2015-03-31'};
  let lambda;

  //use .env file to load permissions to use for Lambda execution, if a .env exists in the function folder
  let envPath = path.join(data.distPath, '.env');
  if (fs.existsSync(envPath)) {
    fancy.info('.env file exists, checking for AWS credentials...');
    require('dotenv').load({path: envPath});
    if (process.env.accessKeyId && process.env.secretAccessKey && process.env.region) {
      fancy.info('using .env for deployment credentials...');
      lambda = new AWS.Lambda({
        accessKeyId: process.env.accessKeyId,
        secretAccessKey: process.env.secretAccessKey,
        region: process.env.region
      });
    }
    else {
      fancy.info('.env has no AWS credentials - using shared credentials file (http://j.mp/awscredentials)...');
      lambda = new AWS.Lambda();
    }
  }
  else {
    fancy.info('No .env file - using shared credentials file (http://j.mp/awscredentials)...');
    lambda = new AWS.Lambda();
  }

  let functionName = data.environment + '-' + data.functionName;
  if (!data.envPrefixes) {
    functionName = data.functionName;
  }
  let zipFile = data.distPath + '.zip';

  let createLambda = function() {
    fancy.info('Updating function ' + functionName);

    let params = {
      Code: {
        ZipFile: fs.readFileSync(zipFile)
      },
      FunctionName: functionName,
      Handler: data.handler,
      Role: data.roleArn,
      Runtime: data.runtime || 'nodejs4.3',
      Description: data.description,
      MemorySize: data.memorySize,
      Timeout: data.timeout
    };

    if (data.VpcConfig) params.VpcConfig = data.VpcConfig;

    lambda.createFunction(params, function(err, result) {
      if (err) {
        fancy.info(chalk.red('Error uploading ' + data.functionName), err);
        callback(err);
      }
      else  {
        callback(null);
      }
    });
  }

  let updateLambda = () => {
    let params = {
      FunctionName: functionName,
      ZipFile: fs.readFileSync(zipFile)
    };

    fancy.info('Updating function ' + functionName + ' from ' + zipFile);

    lambda.updateFunctionCode(params, function(err, result) {
      if (err) {
        fancy.info(chalk.red('Error uploading ' + functionName), err);
        callback(err);
      }
      else {

        let configParams = {
          FunctionName: functionName,
          Handler: data.handler,
          Role: data.roleArn,
          Runtime: data.runtime || 'nodejs4.3',
          Description: data.description,
          MemorySize: data.memorySize,
          Timeout: data.timeout
          // Runtime: data.runtime || 'nodejs4.3'
        };

        if (data.VpcConfig) configParams.VpcConfig = data.VpcConfig;

        // console.log('configParams', configParams);

        lambda.updateFunctionConfiguration(configParams, function(err, data) {
          if (err) {
            fancy.info(chalk.red('Error updating function config for ' + functionName), err);
            callback(err);
          }
          else callback(null);
        });
      }
    });
  }

  let startUpload = () => {
    fancy.info('Getting current lambda function info (if any)...');
    lambda.getFunction({FunctionName: functionName}, function(err, result) {
      if (err) {
        if (err.statusCode === 404) {
          //function doesn't exist yet -- call lambda.createFunction to create it
          createLambda();
        }
        else {
          let warning = 'AWS API request failed. '
          warning += 'Check your AWS credentials and permissions.'
          fancy.info(chalk.yellow(warning), JSON.stringify(lambda, null, 2));
          callback(new Error(warning));
        }
      }
      else {
        //function already exists -- upload latest version
        updateLambda();
      }
    });
  };

  startUpload();
};

let main = (functionName, environment, options) => {
  fancy.info('main...');

  let folderPath = path.join(process.cwd(), '/functions', '/' + functionName);
  let action = options.action;

  //set up global data
  data = JSON.parse(fs.readFileSync(path.join(folderPath, 'lambinator.json'), {encoding:'utf-8'}));
  data.functionName = functionName;
  data.folderPath = folderPath;
  data.distPath = path.join(process.cwd(), '/dist', functionName);
  data.environment = !data.envPrefixes ? 'production' : environment;
  data.localNodeModules = (options && options.localNodeModules) || false;
  data.globalDependenciesDir = path.resolve(path.dirname(fs.realpathSync(__filename)), '../dependencies');
  if (data.options && data.options.testEvent) data.testEvent = data.options.testEvent;

  if (data.testEvents) delete data.testEvents;
  if (data.defaultEvent) delete data.defaultEvent;
  if (data.defaultEnv) delete data.defaultEnv;

  fancy.info('data', data);

  let functionsToRun;
  if (action == 'upload') {
    functionsToRun = [upload];
  }
  else if (action == 'run') {
    functionsToRun = [envFile, npm, copyFiles, processGlobs, copyFunction, runFunction];
  }
  else if (action == 'zip') {
    functionsToRun = [envFile, npm, copyFiles, processGlobs, copyFunction, zipFiles];
  }
  else if (action == 'deploy') {
    functionsToRun = [envFile, npm, copyFiles, processGlobs, copyFunction, zipFiles, upload]; //, zipFiles];
  }
  else if (action == 'clean') {
    functionsToRun = [clean];
  }

  //let the water fall baby
  async.waterfall(functionsToRun, function(err, results) {
    if (err) {
      fancy.info('ERROR', err);
    }
    else {
      fancy.info('Done!');
    }
  });
};

module.exports = main;