
var logger = require('../src/logger');

// Build pelias suggest query
function generate( params, query_mixer ){

  var CmdGenerator = function(params){
    this.params = params;
    this.cmd = {
      'text': params.input
    };
  };    

  CmdGenerator.prototype.get_precision = function() {
    var zoom = this.params.zoom;
    switch (true) {
      case (zoom > 15):
        return 5; // zoom: >= 16
      case (zoom > 9):
        return 4; // zoom: 10-15
      case (zoom > 5):
        return 3; // zoom: 6-9
      case (zoom > 3):
        return 2; // zoom: 4-5
      default:
        return 1; // zoom: 1-3 or when zoom: undefined
    } 
  };

  CmdGenerator.prototype.add_suggester = function(name, precision, layers, fuzzy) {
    this.cmd[name] = {
      'completion' : {
        'size' : this.params.size,
        'field' : 'suggest',
        'context': {
          'dataset': layers || this.params.layers,
          'location': {
            'value': [ this.params.lon, this.params.lat ],
            'precision': precision || this.get_precision()
          }
        },
        'fuzzy': {
          'fuzziness': fuzzy || 0
        }
      }
    };
  };

  var cmd = new CmdGenerator(params);
  query_mixer.forEach(function(item, index){
    if (item.precision && Array.isArray( item.precision ) && item.precision.length ) {
      item.precision.forEach(function(precision) {
        cmd.add_suggester('pelias_'+index, precision, item.layers, item.fuzzy);
      });
    } else {
      cmd.add_suggester('pelias_'+index,  undefined, item.layers, item.fuzzy);
    }
  });
  
  // logger.log( 'cmd', JSON.stringify( cmd.cmd, null, 2 ) );
  return cmd.cmd;

}

module.exports = generate;