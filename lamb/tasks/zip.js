var zipNotDeploy = require('./deploy.js');

var main = function(functionName, environment, zipOnly) {
  zipNotDeploy(functionName, environment, true);  
};

module.exports = main;