var gulp          = require('gulp')
    , gutil       = require('gulp-util')
    , install     = require('gulp-install')
    , zip         = require('gulp-zip')
    , rename      = require('gulp-rename')
    , replace     = require('gulp-replace')
    , AWS         = require('aws-sdk')
    , fs          = require('fs-extra')
    , path        = require('path')
    , async       = require('async')
    , chalk       = require('chalk')
    , pkg         = require(process.cwd() + '/package.json')
    ;

var init = function(func) {
  //create directory
  fs.mkdirsSync('./' + func);

  //copy files and replace template text
  gulp.src(['lamb/files/**','!lamb/files/.env.sample','!lamb/files/function-name.js'])
    .pipe(replace('{{function-name}}', func))
    .pipe(gulp.dest('./functions/' + func));

  //copy env file and rename
  gulp.src(['lamb/files/.env.sample'])
    .pipe(rename('.env'))
    .pipe(gulp.dest('./functions/' + func));


  //copy main function file and rename
  gulp.src(['lamb/files/function-name.js'])
    .pipe(rename(func + '.js'))
    .pipe(gulp.dest('./functions/' + func));

};

module.exports = init;