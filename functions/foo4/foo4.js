var main = function(event, context) {
  var result = JSON.stringify(event, null, 2);
  context.done(null, 'received event: ' + result);
};

module.exports = {
  handler: main
}
