var AWS            = require('aws-sdk')
    , fs           = require('fs-extra')
    , path         = require('path')
    , async        = require('async')
    , chalk        = require('chalk')
    , ncp          = require('ncp')
    , recursive    = require('recursive-readdir')
    , gulp         = require('gulp')
    , install      = require('gulp-install')
    , gutil        = require('gulp-util')
    , next         = require('gulp-next')
    , pkg          = require(process.cwd() + '/package.json')
    ;

var data = {
  folderPath: null,   //e.g. ./functions/hello-world
  distPath: null,     //e.g. ./dist/hello-world
  environment: null   //e.g. staging
};


var clean = function(callback) {
  gutil.log('cleanup prep...');

  fs.remove(path.join(process.cwd(), 'dist'), function(err) {
    if (err) return callback(err);
    fs.ensureDir(data.distPath, function(err) { callback(err); });
  });
};

var npm = function (callback) {
  if (data.localNodeModules) {
    gutil.log('copying NPM modules for deployment...');
    fs.copySync(
      path.join(process.cwd(), 'node_modules'),
      path.join(data.distPath, 'node_modules')
    );
    callback(null);
  }
  else {
    gutil.log('creating package.json for installing package dependencies...');
    if (data.packages) {
      var packagePath = path.join(data.distPath, 'package.json');
      var packages = {
        dependencies: data.packages
      };
      fs.writeFileSync(packagePath, JSON.stringify(packages, null, 2));
      gutil.log('installing function packages from NPM...');
      return gulp.src(packagePath)
        .pipe(install({ production: true }))
        .pipe(next(function() {
          callback(null);
        }));
    }
    else {
      gutil.log('installing all project packages from NPM...');
      return gulp.src('./package.json')
        .pipe(gulp.dest(data.distPath))
        .pipe(install({ production: true }))
        .pipe(next(function() {
          callback(null);
        }));
    }
  }
};

var envFile = function (callback) {
  gutil.log('managing .env file:', data.environment);
  //concat environment specific .env file if there is one
  var targetedEnv = path.join(data.folderPath, '.env.' + data.environment);
  var finalEnv = path.join(data.distPath, '.env');
  var hasTargetedEnv = fs.existsSync(targetedEnv);

  if (!hasTargetedEnv) {
    gutil.log('no .env found for ' + data.environment);
    return callback(null);
  }
  else {
    gutil.log('found .env.' + data.environment);
    fs.copy(targetedEnv, finalEnv, callback);
    // fs.createReadStream(targetedEnv).pipe(fs.createWriteStream(finalEnv));
    // callback(null);
  }
};

var makeDist = function(callback) {
  gutil.log('creating dist folder...');

  //copy any file dependencies
  var globalDependenciesDir = path.resolve(path.dirname(fs.realpathSync(__filename)), '../dependencies');

  if (data.dependencies) {
    gutil.log("adding dependencies:", data.dependencies);
    data.dependencies.forEach(function (file) {
      if (file == '.env') {
        gutil.log('skipping .env : handled separately', file);
      }
      else {
        gutil.log('adding dependency:', file);
        var functionDependency = path.join(data.folderPath, file);
        var globalDependency = path.join(globalDependenciesDir, file);

        //look in function directory for file
        if (fs.existsSync(functionDependency)) {
          gutil.log('Using locally provided dependency:', functionDependency);
          fs.copySync(functionDependency, path.join(data.distPath, file));
        }
        //look in global dependencies folder
        else if (fs.existsSync(globalDependency)) {
          gutil.log('Using global dependency:', globalDependency);
          fs.copySync(globalDependency, path.join(data.distPath, file));
        }
      }
    });
  }

  //copy function itself
  var functionFile = path.join(data.folderPath, data.functionName + '.js');
  gutil.log('copying function:', functionFile);
  fs.copySync(functionFile, path.join(data.distPath, data.functionName + '.js'));

  //copy settings file for environment to settings.json
  var settingsFile =  process.cwd() + '/functions/' + data.functionName + '/settings-' + data.environment + '.json';
  if (fs.existsSync(settingsFile)) {
    gutil.log('copying settings-' + data.environment + '.json to settings.json');
    fs.copySync(settingsFile, path.join(data.distPath, 'settings.json'));
  }

  callback(null);
};

var zipFiles = function(callback) {
  gutil.log('zipping files...');


  if (process.platform !== 'win32') {
    //use native zip
    var cmd = 'zip -r ' + data.distPath + '.zip' + ' .';
    var exec = require('child_process').exec;

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
    var zip = new require('node-zip')();
    var search = data.distPath;
    recursive(search, function(err, files) {

      files.forEach(function(file) {
        var path = file.substring(file.indexOf(search) + search.length + 1);
        if (fs.lstatSync(file).isFile()) {
          zip.file(path, fs.readFileSync(file));
        }
      });

      var buffer = zip.generate({type: 'nodebuffer', compression: 'DEFLATE'});

      fs.writeFile(data.distPath + '.zip', buffer, function(err) {
        if (err) callback(err)
        else callback(null);
      });

    });

  }
};

var upload = function(callback) {
  //set region from lambinator.config:region
  AWS.config.update({region:data.region});
  AWS.config.apiVersions = {lambda: '2015-03-31'};

  //use .env file to load permissions to use for Lambda execution, if a .env exists in the function folder
  var envPath = path.join(data.distPath, '.env');
  if (fs.existsSync(envPath)) {
    gutil.log('.env file exists, checking for AWS credentials...');
    require('dotenv').load({path: envPath});
    if (process.env.accessKeyId && process.env.secretAccessKey && process.env.region) {
      gutil.log('using .env for deployment credentials...');
      lambda = new AWS.Lambda({
        accessKeyId: process.env.accessKeyId,
        secretAccessKey: process.env.secretAccessKey,
        region: process.env.region
      });
    }
    else {
      gutil.log('.env has no AWS credentials - using shared credentials file (j.mp/awscredentials)...');
      lambda = new AWS.Lambda();
    }
  }
  else {
      gutil.log('No .env file - using shared credentials file (j.mp/awscredentials)...');
      lambda = new AWS.Lambda();
  }

  var functionName = data.environment + '-' + data.functionName;
  if (!data.envPrefixes) {
    functionName = data.functionName;
  }
  var zipFile = data.distPath + '.zip';

  var createLambda = function() {
    gutil.log('Updating function ' + functionName);

    var params = {
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
        gutil.log(chalk.red('Error uploading ' + data.functionName), err);
        callback(err);
      }
      else  {
        callback(null);
      }
    });
  }

  var updateLambda = function() {
    var params = {
      FunctionName: functionName,
      ZipFile: fs.readFileSync(zipFile)
    };

    gutil.log('Updating function ' + functionName + ' from ' + zipFile);

    lambda.updateFunctionCode(params, function(err, result) {
      if (err) {
        gutil.log(chalk.red('Error uploading ' + functionName), err);
        callback(err);
      }
      else {

        var configParams = {
          FunctionName: functionName,
          Handler: data.handler,
          Role: data.roleArn,
          Description: data.description,
          MemorySize: data.memorySize,
          Timeout: data.timeout
          // Runtime: data.runtime || 'nodejs4.3'
        };

        if (data.VpcConfig) configParams.VpcConfig = data.VpcConfig;

        // console.log('configParams', configParams);

        lambda.updateFunctionConfiguration(configParams, function(err, data) {
          if (err) {
            gutil.log(chalk.red('Error updating function config for ' + functionName), err);
            callback(err);
          }
          else callback(null);
        });
      }
    });
  }

  var startUpload = function() {
    gutil.log('Getting current lambda function info (if any)...');
    lambda.getFunction({FunctionName: functionName}, function(err, result) {
      if (err) {
        if (err.statusCode === 404) {
          //function doesn't exist yet -- call lambda.createFunction to create it
          createLambda();
        }
        else {
          var warning = 'AWS API request failed. '
          warning += 'Check your AWS credentials and permissions.'
          gutil.log(chalk.yellow(warning), JSON.stringify(lambda, null, 2));
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

var main = function (functionName, environment, options) {
  var folderPath = path.join(process.cwd(), '/functions', '/' + functionName);
  var action = options && options.zipOnly ? 'zipping' : 'deploying';

  //set up global data
  data = JSON.parse(fs.readFileSync(path.join(folderPath, 'lambinator.json'), {encoding:'utf-8'}));
  data.folderPath = folderPath;
  data.distPath = path.join(process.cwd(), '/dist', functionName);
  data.environment = environment;
  data.uploadOnly = options && options.uploadOnly;
  data.localNodeModules = options && options.localNodeModules;

  if (data.testEvents) delete data.testEvents;
  if (data.defaultEvent) delete data.defaultEvent;
  if (data.defaultEnv) delete data.defaultEnv;

  gutil.log('data', data);

  var functionsToRun = [clean, npm, envFile, makeDist, zipFiles];
  if (data.uploadOnly) functionsToRun = [upload];
  else if (action != 'zipping') functionsToRun.push(upload);

  //let the water fall baby
  async.waterfall(functionsToRun, function(err, results) {
    if (err) {
      gutil.log('ERROR', err);
    }
    else {
      gutil.log('Done!');
    }
  });
};


module.exports = main;
