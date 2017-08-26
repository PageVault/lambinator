process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const settings = require(path.join(process.cwd(), 'settings.json'));
const AWS = require('aws-sdk');

let log;

AWS.config.update({ region: settings.region || 'us-east-1' });

let validate = (state) => {
  return new Promise((resolve, reject) => {
    //initializations
    state.uuid = state.message.uuid || short().new();

    //logger
    log = console;
    if (!log.error) log.error = log.info;

    //check required fields in message
    let requiredFields = ['uuid', 'url'];
    for (let field of requiredFields) {
      if (!state.message[field]) return reject(new Error(field + ' is required'));
    }

    resolve(state);
  });
};


let main = (event, context, next) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let message = event.Records[0].Sns.Message;
  if (typeof message == 'string') message = JSON.parse(message);
  let state = { message: message };

  validate(state)
    .then(state => {
      log.info('Done!', state);
      next(null);
    })
    .catch(err => {
      log.error('ERROR', err);
      log.error('original message:', message);
      next(err);
    })
};

module.exports.handler = main;