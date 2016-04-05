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

  //copy files and replace template text
  var lambRoot = path.join(process.cwd(), 'lamb/files');
  // var devRoot = path.join(process.cwd(), 'lamb/files');
  // var runRoot = path.join(process.cwd(), 'node_modules/lambinator/lamb/files');
  // var lambRoot = fs.existsSync(runRoot) ? runRoot : devRoot;
  gulp.src([lambRoot + '/*.json', lambRoot + '/.env.sample', '!' + lambRoot + '/function-name.js'])
    .pipe(replace('{{function-name}}', func))
    .pipe(gulp.dest('./functions/' + func));

  //copy main function file and rename
  gulp.src([lambRoot + '/function-name.js'])
    .pipe(rename(func + '.js'))
    .pipe(gulp.dest('./functions/' + func));


  gutil.log(func + ' created at ' + path.resolve('./functions/' + func));
};

module.exports = main;