var AWS           = require('aws-sdk')
    , fs          = require('fs-extra')
    , path        = require('path')
    , async       = require('async')
    , chalk       = require('chalk')
    , ncp         = require('ncp')
    , gulp        = require('gulp')
    , zip         = require('gulp-zip')
    , pkg         = require(process.cwd() + '/package.json')
    ;

var data = {
  folderPath: null,   //e.g. ./functions/hello-world
  distPath: null,     //e.g. ./dist/hello-world
  environment: null   //e.g. staging
};

  
var clean = function(callback) {
  console.log('cleanup prep...');

  fs.remove(path.join(process.cwd(), 'dist'), function(err) {
    if (err) return callback(err);
    fs.ensureDir(data.distPath, function(err) { callback(err); });
  });
};

var npm = function(callback) {
  console.log('copying NPM modules for deployment...');
  ncp(
    path.join(process.cwd(), 'node_modules'),
    path.join(data.distPath, 'node_modules'),
    function(err) { callback(err); }
  );

};

var envFile = function(callback) {
  console.log('copying .env file...');
  //use environment specific .env file if there is one
  fs.exists(path.join(data.folderPath, '.env.' + data.environment), function(exists) {
    var filename = "";
    
    if (exists) {
      filename = path.join(data.folderPath, '.env.' + data.environment);
      console.log(chalk.yellow('using .env.' + data.environment + '...'), filename);
      fs.createReadStream(filename).pipe(fs.createWriteStream(path.join(data.distPath, '.env.' + data.environment)));
    }
    else {
      filename = path.join(data.folderPath, '.env');
      console.log('copying file:', filename);
      fs.createReadStream(filename).pipe(fs.createWriteStream(path.join(data.distPath, '.env')));
    }
    
    callback(null);
  });
};

var makeDist = function(callback) {
  console.log('creating dist folder...');

  //copy any file dependencies
  var devRoot = path.join(process.cwd(), 'dependencies');
  var runRoot = path.join(process.cwd(), 'node_modules/lambinator/dependencies');
  var lambRoot = fs.existsSync(runRoot) ? runRoot : devRoot; 

  if (data.dependencies) {
    data.dependencies.forEach(function(file) {
      console.log('adding dependency:', file);
      var functionDependency = path.join(data.folderPath, file);
      var globalDependency = path.join(lambRoot, file);
      
      console.log('functionDependency', functionDependency);
      console.log('globalDependency', globalDependency);
      
      //look in function directory for file
      if (fs.existsSync(functionDependency)) {
        fs.createReadStream(functionDependency).pipe(fs.createWriteStream(path.join(data.distPath, file)));
      }
      //look in global dependencies folder
      else if (fs.existsSync(globalDependency)) {
        fs.createReadStream(globalDependency).pipe(fs.createWriteStream(path.join(data.distPath, file)));
      }
    });
  }
  
  //copy function itself
  var functionFile = path.join(data.folderPath, data.functionName + '.js');
  console.log('copying function:', functionFile);
  fs.createReadStream(functionFile).pipe(fs.createWriteStream(path.join(data.distPath, data.functionName + '.js')));
  callback(null);
};

var zipFiles = function(callback) {
  var input = data.distPath;
  var output = path.join(process.cwd(), 'dist', data.functionName + '.zip');
  var zip = new Zip();

  console.log('zipping contents in ' + input + '...');
  console.log('zipping to ' + output + '...');

  zip.add(output, input)
    .then(callback)
    .catch(callback);
};

var gulpZipFiles = function(callback) {
  try {
    gulp.src(data.distPath + '/**/*')
      .pipe(zip(data.functionName + '.zip'))
      .pipe(gulp.dest('./dist'));
    callback(null);
  }
  catch(err) {
    callback(err);
  }    
};

var upload = function(callback) {
  // AWS.config.region = process.env.AWS_REGION ;
  var lambda = new AWS.Lambda();
  var functionName = data.environment + '-' + data.functionName;
  var zipFile = './dist/' + data.functionName + '.zip';

  var createLambda = function() {
    console.log('Updating function ' + functionName);

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

    lambda.createFunction(params, function(err, data) {
      if (err) {
        console.log(chalk.red('Error uploading ' + data.functionName), err);
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

    console.log('Updating function ' + functionName + ' from ' + zipFile);

    lambda.updateFunctionCode(params, function(err, data) {
      if (err) {
        console.log(chalk.red('Error uploading ' + functionName), err);
        callback(err);
      }
      else {
        callback();
      }
    });
  }

  var startUpload = function() {
    lambda.getFunction({FunctionName: functionName}, function(err, data) {
      if (err) {
        if (err.statusCode === 404) {
          //function doesn't exist yet -- call lambda.createFunction to create it
          createLambda();
        }
        else {
          var warning = 'AWS API request failed. '
          warning += 'Check your AWS credentials and permissions.'
          console.log(chalk.yellow(warning));
          callback(new Error(warning));
        }
      }
      else {
        //function already exists -- upload latest version
        updateLambda();
      }
    });
  };

  //having async issues with zip task completing -- wait a second before starting upload
  setTimeout(startUpload, 3000);  
};

var main = function(functionName, environment, zipOnly) {
  var folderPath = path.join(process.cwd(), '/functions', '/' + functionName);
  console.log('deploying function', folderPath);
  
  //set up global data
  data = JSON.parse(fs.readFileSync(path.join(folderPath, 'lambinator.json'), {encoding:'utf-8'}));
  data.folderPath = folderPath;
  data.distPath = path.join(process.cwd(), '/dist', functionName);
  data.environment = environment;
  
  var functionsToRun = [clean, npm, envFile, makeDist, gulpZipFiles];
  if (!zipOnly) functionsToRun.push(upload);
  
  //let the water fall baby
  async.waterfall(functionsToRun, function(err, results) {
    if (err) {
      console.log('ERROR', err);
    }
    else {
      console.log('results', results);
    }
  });
};


module.exports = main;
