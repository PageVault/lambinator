var AWS           = require('aws-sdk')
    , fs          = require('fs-extra')
    , path        = require('path')
    , async       = require('async')
    , chalk       = require('chalk')
    , ncp         = require('ncp')
    , JSZip       = require('jszip')
    , recursive   = require('recursive-readdir')
    , gutil       = require('gulp-util')
    , pkg         = require(process.cwd() + '/package.json')
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

var npm = function(callback) {
  gutil.log('copying NPM modules for deployment...');
  ncp(
    path.join(process.cwd(), 'node_modules'),
    path.join(data.distPath, 'node_modules'),
    function(err) { callback(err); }
  );

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
  var devRoot = path.join(process.cwd(), 'dependencies'); //we're in dev mode
  var runRoot = path.join(process.cwd(), 'node_modules/lambinator/dependencies'); //we're in runtime mode
  var lambRoot = fs.existsSync(runRoot) ? runRoot : devRoot;

  if (data.dependencies) {
    data.dependencies.forEach(function (file) {
      if (file == '.env') {
        gutil.log('skipping .env : handled separately', file);
      }
      else {
        gutil.log('adding dependency:', file);
        var functionDependency = path.join(data.folderPath, file);
        var globalDependency = path.join(lambRoot, file);


        //look in function directory for file
        if (fs.existsSync(functionDependency)) {
          gutil.log('functionDependency', functionDependency);
          fs.copySync(functionDependency, path.join(data.distPath, file));
          // fs.createReadStream(functionDependency).pipe(fs.createWriteStream(path.join(data.distPath, file)));
        }
        //look in global dependencies folder
        else if (fs.existsSync(globalDependency)) {
          gutil.log('globalDependency', globalDependency);
          fs.copySync(globalDependency, path.join(data.distPath, file));
          // fs.createReadStream(globalDependency).pipe(fs.createWriteStream(path.join(data.distPath, file)));
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

  var zip = new JSZip();
  var search = data.distPath;

  recursive(search, function(err, files) {
    // var file = files[0];
    files.forEach(function(file) {
      var path = file.substring(file.indexOf(search) + search.length + 1);
      zip.file(path, fs.readFileSync(file));
    });

    var buffer = zip.generate({type:"nodebuffer"});

    fs.writeFile(data.distPath + '.zip', buffer, function(err) {
      if (err) callback(err)
      else callback(null);
    });

  });
};

var upload = function(callback) {
  //set region from lambinator.config:region
  AWS.config.update({region:data.region});

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
      Runtime: 'nodejs',  /* duh */
      Description: data.description,
      MemorySize: data.memorySize,
      Timeout: data.timeout
    };

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
        callback();
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

var main = function(functionName, environment, zipOnly) {
  var folderPath = path.join(process.cwd(), '/functions', '/' + functionName);
  var action = zipOnly ? 'zipping' : 'deploying';
  gutil.log(action + ' function', folderPath);

  //set up global data
  data = JSON.parse(fs.readFileSync(path.join(folderPath, 'lambinator.json'), {encoding:'utf-8'}));
  data.folderPath = folderPath;
  data.distPath = path.join(process.cwd(), '/dist', functionName);
  data.environment = environment;

  gutil.log('data', data);

  var functionsToRun = [clean, npm, envFile, makeDist, zipFiles];
  if (!zipOnly) functionsToRun.push(upload);

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
