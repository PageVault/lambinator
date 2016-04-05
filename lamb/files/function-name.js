var fs    = require('fs')
  , path  = require('path')
  ;

var settings = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'settings.json')));

var main = function(event, context) {
  var result = JSON.stringify(event, null, 2);
  console.log('favorite planet is ' + settings.favoritePlanet);
  context.done(null, 'received event: ' + result);
};

module.exports = {
  handler: main
}

