const fs = require('fs');
const path = require('path');
const bluebird = require('bluebird');
const settings = require(path.join(process.cwd(), 'settings.json'));
const AWS = require('aws-sdk');
AWS.config.update({ region: settings.region || 'us-east-1' });

const main = (event, context, next) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    console.log(event, settings);
    return next(null, 'Done!');
  }
  catch(err) {
    return next(err);
  }
};

module.exports.handler = main;