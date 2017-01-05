'use strict';

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

let fs = require('fs');
let path = require('path');
let settings = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'settings.json')));

let main = (event, context, next) => {
  let result = JSON.stringify(event, null, 2);
  console.log('favorite planet is ' + settings.favoritePlanet);
  next(null, 'received event: ' + result);
};

module.exports.handler = main;