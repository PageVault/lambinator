const AWS = require('aws-sdk');
const async = require('async');
AWS.config.update({region: 'us-east-1'});
const sns = new AWS.SNS();

const data = {
  "region": "us-east-1",
  "functionName":  "test-deploy-function",
  "handler":        "test-deploy-function.handler",
  "description":    "Used to test lambinator deployments",
  "roleName": "lambda_s3_exec_role",
  "runtime": "nodejs6.10",
  "envPrefixes": true,
  "memorySize":     128,
  "timeout":        10,
  "snsTopic": "test-deploy-function",
  "testEvents": {
    "sns": {
      "Records": [
        {
          "Sns": {
            "Message": "abcde-12345"
          }
        }
      ]
    }
  },
  "defaultEvent": "sns",
  "defaultEnv": "staging"
}

const getIdentity = (callback) => {
  const sts = new AWS.STS();
  sts.getCallerIdentity({}, (err, result) => {
    if (err) return callback(err);
    data.accountId = result.Account;
    callback(null);
  })
};

const createSns = (callback) => {
  // TODO: REPLACE THIS!
  data.environment = 'qa';
  const functionName = data.envPrefixes ? data.environment + '-' + data.functionName : data.functionName;
  data.functionArn = `arn:aws:lambda:${data.region}:${data.accountId}:function:${functionName}`;
  // END TODO

  if (!data.snsTopic) return callback(null);
  
  // create topic if it does not exist
  const topicName = data.envPrefixes ? data.environment + '-' + data.snsTopic : data.snsTopic;

  data.topicArn = `arn:aws:sns:${data.region}:${data.accountId}:${topicName}`;

  sns.getTopicAttributes({TopicArn: data.topicArn}, (err, topic) => {
    if (err) {
      if (err.statusCode == '404') {
        console.log('Creating SNS topic:', data.topicArn);
        sns.createTopic({Name: topicName}, (err, topic) => {
          if (err) return callback(err);
          console.log('Topic created:', topic);
          return callback(null);
        });
        return callback(null);
      }
      else {
        return callback(err);
      }
    }
    else {
      console.log('SNS topic exists:', data.topicArn);
      return callback(null);
    }
  });
};

const wireSns = (callback) => {
  console.log('checking for SNS topic subscription...');
  const subscribeFunction = (cb) => {
    const subscribeParams = {
      TopicArn: data.topicArn,
      Protocol: 'lambda',
      Endpoint: data.functionArn
    };

    sns.subscribe(subscribeParams, (err, result) => {
      if(err) return cb(err);
      else return cb(null);
    });
  };

  sns.listSubscriptionsByTopic({TopicArn: data.topicArn}, (err, result) => {
    if (err) return callback(err);
    if(result.Subscriptions.length == 0) {
      console.log('No subscription yet -- subscribing...');
      subscribeFunction(callback);
    }
    else {
      // see if this function is in the list of subscribers
      const exists = (result.Subscriptions.filter(f => f.Endpoint == data.functionArn).length == 1);
      if (exists) {
        console.log('Subscription exists.');
        return callback(null);        
      }
      else {
        console.log('No subscription yet -- subscribing...');
        subscribeFunction(callback);
      }
    }
  });
}

const funcsToCall = [getIdentity]; //, createSns, wireSns]
async.waterfall(funcsToCall, (err) => {
  if (err) console.log('ERROR', err);
  else console.log('Done!');
})