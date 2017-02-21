'use strict';

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

const fs = require('fs-extra');
const path = require('path');
const settings = require(path.join(process.cwd(), 'settings-production.json'));
const short = require('short-uuid');
const Promise = require('bluebird');
const AWS = require('aws-sdk');
let log;

AWS.config.update({ region: settings.region || 'us-east-1' });

let validate = (data) => {
  return new Promise((resolve, reject) => {
    //check required fields in message
    let requiredFields = ['uuid', 'url'];
    for (let field of requiredFields) {
      if (!data.message[field]) return reject(new Error(field + ' is required'));
    }

    //initializations
    data.uuid = data.message.uuid || short().new();

    //logger
    log = console;
    if (!log.error) log.error = log.info;

    resolve(data);
  });
};


let main = (event, context, next) => {
  let message = event.Records[0].Sns.Message;
  if (typeof message == 'string') message = JSON.parse(message);
  let data = { message: message };

  validate(data)
    .then(data => {
      log.info('Done!', data);
      next(null);
    })
    .catch(err => {
      log.error('ERROR', err);
      log.error('original message:', message);
      next(err);
    })
};

module.exports.handler = main;