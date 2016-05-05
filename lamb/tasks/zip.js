var zipNotDeploy = require('./deploy.js');

var main = function (functionName, environment, options) {
  if (!options) options = {};
  options.zipOnly = true;
  console.log('options', options);
  //zipNotDeploy(functionName, environment, options);
};

module.exports = main;