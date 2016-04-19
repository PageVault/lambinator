var zipNotDeploy = require('./deploy.js');

var main = function(functionName, environment) {
  zipNotDeploy(functionName, environment, {zipOnly: true});
};

module.exports = main;