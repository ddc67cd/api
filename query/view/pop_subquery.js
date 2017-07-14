
var peliasQuery = require('pelias-query'),
    check = require('check-types');

/**
  Population / Popularity subquery

  In prior versions we have had restricted the population/popularity boost
  to only a section of the query results.

  Currently it is configured to `match_all`, ie. targets all records.
**/

module.exports = function( vs ){
//  return { 'match_all': {} };
  if( !vs.isset('input:name') ||
      !vs.isset('phrase:analyzer') ||
      !vs.isset('phrase:field') ||
      !vs.isset('phrase:boost') ||
      !vs.isset('phrase:slop') ){
    return null;
  }

  var view = { 'match': {} },
      query = vs.var('input:name').$;

  if(vs.isset('input:housenumber')) {
      query = query.replace(vs.var('input:housenumber'), '');
  }

  // match query
  view.match[ vs.var('phrase:field') ] = {
    analyzer: vs.var('phrase:analyzer'),
    type: 'phrase',
    boost: vs.var('phrase:boost'),
    slop: vs.var('phrase:slop'),
    query: query
  };

  return view;

};
