var check = require('check-types'),
    es = require('elasticsearch'),
    logger = require( 'pelias-logger' ).get( 'api' ),
    exceptions = require('elasticsearch-exceptions/lib/exceptions/SupportedExceptions');

// create a list of regular expressions to match against.
// note: list created when the server starts up; for performance reasons.
var exceptionRegexList = exceptions.map( function( exceptionName ){
  return new RegExp( '^' + exceptionName );
});

function sendJSONResponse(req, res, next) {

  // default status
  var statusCode = 200; // 200 OK

  // respond
  return res.status(statusCode).json(res.body);
}

module.exports = sendJSONResponse;
