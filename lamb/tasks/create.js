var gulp          = require('gulp')
    , rename      = require('gulp-rename')
    , replace     = require('gulp-replace')
    , fs          = require('fs-extra')
    , chalk       = require('chalk')
    , path        = require('path')
    , fancy       = require('fancy-log')
    ;

var main = function(func) {
  //create directory
  fs.ensureDirSync('./functions/' + func);

  //get files dir
  var filesDir = path.resolve(path.dirname(fs.realpathSync(__filename)), '../files');
  // console.log('filesDir', filesDir);

  //copy files and replace template text
  gulp.src([filesDir + '/*.json', filesDir + '/readme.md', '!' + filesDir + '/function-name.js'])
    .pipe(replace('{{function-name}}', func))
    .pipe(replace('{{created-date}}', new Date()))
    .pipe(replace('{{default-role-name}}', 'lambda_s3_exec_role'))
    .pipe(gulp.dest('./functions/' + func));

  //copy main function file and rename
  gulp.src([filesDir + '/function-name.js'])
    .pipe(rename(func + '.js'))
    .pipe(gulp.dest('./functions/' + func));


  fancy.info(func + ' created at ' + path.resolve('./functions/' + func));
};

module.exports = main;