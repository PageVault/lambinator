var gulp          = require('gulp')
    , rename      = require('gulp-rename')
    , replace     = require('gulp-replace')
    , fs          = require('fs-extra')
    , chalk       = require('chalk')
    , path        = require('path')
    , gutil       = require('gulp-util')
    ;

var main = function(func) {
  //create directory
  fs.ensureDirSync('./functions/' + func);

  //get files dir
  var filesDir = path.resolve(path.dirname(fs.realpathSync(__filename)), '../files');
  // console.log('filesDir', filesDir);

  //copy files and replace template text
  gulp.src([filesDir + '/*.json', filesDir + '/.env.sample', '!' + filesDir + '/function-name.js'])
    .pipe(replace('{{function-name}}', func))
    .pipe(gulp.dest('./functions/' + func));

  //copy main function file and rename
  gulp.src([filesDir + '/function-name.js'])
    .pipe(rename(func + '.js'))
    .pipe(gulp.dest('./functions/' + func));


  gutil.log(func + ' created at ' + path.resolve('./functions/' + func));
};

module.exports = main;