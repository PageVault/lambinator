'use strict';

const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const async = require('async');

const baseDir = '/Users/todd/git/PageVault/pv-lambinator/functions/file-capture-pipeline'
const targetDir = '/Users/todd/git/PageVault/pv-lambinator/dist/file-capture-pipeline';

let data = {
  dependencies: ['exiftool', 'lib/**/*', 'wkhtmltopdf']
};

let dependencyPromise = new Promise((resolve, reject) => {
  if (!data.dependencies) {
    return resolve();
  }
  else {
    gutil.log("adding dependencies:", data.dependencies);
    async.each(data.dependencies, (file, dependenciesCallback) => {

      if (file == '.env') {
        gutil.log('skipping .env : handled separately', file);
        dependenciesCallback();
      }
      else {
        gutil.log('adding dependency:', file);
        let functionDependency = path.join(data.folderPath, file);
        let globalDependency = path.join(globalDependenciesDir, file);

        glob(path.join(data.folderPath, file), (err, matches) => {
          if (err) console.log('ERR', err);
          else {
            async.each(matches, (match, matchesCallback) => {

              fs.lstat(match, (err, stat) => {
                if (err) return matchesCallback(err);

                if (stat.isFile()) {
                  let targetPath = path.join(data.distPath, match.replace(data.folderPath, ''));
                  fs.ensureDir(path.dirname(targetPath), (err) => {
                    if (err) return matchesCallback(err);

                    gutil.log(targetPath);
                    fs.copy(match, targetPath, matchesCallback);
                  });
                }

              });

            }, (err) => {
              if (err) dependenciesCallback(err);
              else dependenciesCallback();
            });
          }
        })
      }
    }, (err) => {
      if (err) reject(err);
      else resolve();
    })
  }
});


dependencyPromise.then(() => {
  console.log('Done!');
}).error(err => {
  console.log('ERROR:', err);
})