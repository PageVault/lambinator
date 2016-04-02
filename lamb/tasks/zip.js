var zipNotDeploy = require('./deploy.js');

var main = function(functionName, environment) {
  zipNotDeploy(functionName, environment, true);
};

module.exports = main;