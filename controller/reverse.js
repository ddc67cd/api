'use strict';

const _ = require('lodash');

const searchService = require('../service/search');
const logger = require('pelias-logger').get('api');
const logging = require( '../helper/logging' );
const retry = require('retry');
const pg = require('pg');

function isRequestTimeout(err) {
  return _.get(err, 'status') === 408;
}

function setup( apiConfig, esclient ){
  const dsn = 'postgres://gis:gis@pg.service.consul:6432/gis';
  const client = new pg.Client(dsn);
  client.connect();
  logger.info('[reverse]', 'Init complete');

  function controller( req, res, next ){
    let cleanOutput = _.cloneDeep(req.clean);
    if (logging.isDNT(req)) {
      cleanOutput = logging.removeFields(cleanOutput);
    }

    // log clean parameters for stats
    logger.info('[req]', 'endpoint=' + req.path, cleanOutput);

    client.query(
      "SELECT osm_id FROM osm_buildings WHERE ST_Contains(geometry, ST_Transform(ST_GeometryFromText('POINT(" + req.clean['point.lon'] + " " + req.clean['point.lat'] + ")', 4326), 3857))",
      function (err, result) {
        if (err) {
          peliasLogger.error( 'failed to denormalize way', e );
          next();
        }

        if (!result.rowCount) {
          next();
        }

        const osm_id = result.rows[0].osm_id;

        // TODO gotta fix imposm mappings, so it will store object type (node, way)

        const operationOptions = {
          retries: _.get(apiConfig, 'requestRetries', 3),
          factor: 1,
          minTimeout: _.get(esclient, 'transport.requestTimeout')
        };

        // setup a new operation
        const operation = retry.operation(operationOptions);

        function getOsmId(id) {
          if (id > 0) {
            return 'way:' + id;
          } else {
            return 'relation:' + id;
          }
        }
        const cmd = {
            index: apiConfig.indexName,
            type: 'address',
            id: getOsmId(osm_id),
        };
        console.log('es cmd: ', cmd);


        operation.attempt((currentAttempt) => {
          esclient.get(cmd, function (err, data) {
            // log total ms elasticsearch reported the query took to execute
            if( data && data.took ){
              logger.verbose( 'time elasticsearch reported:', data.took / 1000 );
            }
            console.log(data);
              logger.debug('[ES raw response]', data);

            // handle elasticsearch errors
            if( err ){
              logger.error( `elasticsearch error ${err}` );
              if (_.isObject(err) && err.message) {
                req.errors.push( err.message );
              } else {
                req.errors.push( err );
              }
            } else {
              // log that a retry was successful
              // most requests succeed on first attempt so this declutters log files
              if (currentAttempt > 1) {
                logger.info(`succeeded on retry ${currentAttempt-1}`);
              }

              // map returned documents
              var docs = [];
              if (data.found) {
                docs.push(data._source);
              }
              var meta = {
                scores: []
              };

              logger.debug('[ES response]', docs);

              res.data = docs;
              res.meta = meta || {};

              const messageParts = [
                '[controller:reverse]',
                `[es_result_count:${_.get(res, 'data', []).length}]`
              ];

              logger.info(messageParts.join(' '));
            }
            next();
          });

        });
    });
  }
  return controller;
}

module.exports = setup;
