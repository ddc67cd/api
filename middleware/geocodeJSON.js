var url = require('url');
var extend = require('extend');
var geojsonify = require('../helper/geojsonify');
var _ = require('lodash');

/**
 * Returns a middleware function that converts elasticsearch
 * results into geocodeJSON format.
 *
 * @param {object} [peliasConfig] api portion of pelias config
 * @param {string} [basePath]
 * @returns {middleware}
 */
function setup(peliasConfig, basePath) {

  var opts = {
    config: peliasConfig || require('pelias-config').generate().api,
    basePath: basePath || '/'
  };

  function middleware(req, res, next) {
    return convertToGeocodeJSON(req, res, next, opts);
  }

  return middleware;
}

/**
 * Converts elasticsearch results into geocodeJSON format
 *
 * @param {object} req
 * @param {object} res
 * @param {object} next
 * @param {object} opts
 * @param {string} opts.basePath e.g. '/v1/'
 * @param {string} opts.config.host e.g. 'pelias.mapzen.com'
 * @param {string} opts.config.version e.g. 1.0
 * @returns {*}
 */
function convertToGeocodeJSON(req, res, next, opts) {
  res.body = {
    results: [],
    status: "OK",
  };

  addMessages(req, 'warnings', res.body);
  addMessages(req, 'errors', res.body);

  for (var i = 0, len = res.data?res.data.length:0; i < len; i++) {
    var address = res.data[i];
    doc = {
      "address_components" : [
        {
          "long_name" : address.address_parts?address.address_parts.number: 0,
          "short_name" : address.address_parts?address.address_parts.number: 0,
          "types" : [ "street_number" ]
        },
        {
          "long_name" : address.address_parts?address.address_parts.street: 0,
          "short_name" : address.address_parts?address.address_parts.street: 0,
          "types" : [ "route" ]
        },
        //{
        //  "long_name" : "Tsentralnyy administrativnyy okrug",
        //  "short_name" : "Tsentralnyy administrativnyy okrug",
        //  "types" : [ "political", "sublocality", "sublocality_level_1" ]
        //},
        //{
        //  "long_name" : "Moskva",
        //  "short_name" : "Moskva",
        //  "types" : [ "locality", "political" ]
        //},
        //{
        //  "long_name" : "gorod Moskva",
        //  "short_name" : "g. Moskva",
        //  "types" : [ "administrative_area_level_2", "political" ]
        //},
        //{
        //  "long_name" : "Moscow",
        //  "short_name" : "Moscow",
        //  "types" : [ "administrative_area_level_1", "political" ]
        //},
        //{
        //  "long_name" : "Russia",
        //  "short_name" : "RU",
        //  "types" : [ "country", "political" ]
        //},
        //{
        //  "long_name" : "125009",
        //  "short_name" : "125009",
        //  "types" : [ "postal_code" ]
        //}
      ],
      //"raw": address,
      "formatted_address" : address.name.default,
      "geometry" : {
        "location" : {
          "lat" : address.center_point.lat,
          "lng" : address.center_point.lon
        },
        "location_type" : "ROOFTOP",
      },
      "place_id" : address.source_id,
      "types" : [ "street_address" ]
    }

    if (address.bounding_box) {
      console.log('bbox is ', address.bounding_box);
      doc.geometry.viewport = {
          "northeast" : {
            "lat" : address.bounding_box.upperLeft.lat,
            "lng" : address.bounding_box.lowerRight.lon,
          },
          "southwest" : {
            "lat" : address.bounding_box.lowerRight.lat,
            "lng" : address.bounding_box.upperLeft.lon
          }
      }
    }

    res.body.results.push(doc);
  }

  next();

/*


  res.body = { geocoding: {} };

  // REQUIRED. A semver.org compliant version number. Describes the version of
  // the GeocodeJSON spec that is implemented by this instance.
  res.body.geocoding.version = '0.2';

  // OPTIONAL. Default: null. The attribution of the data. In case of multiple sources,
  // and then multiple attributions, can be an object with one key by source.
  // Can be a URI on the server, which outlines attribution details.
  res.body.geocoding.attribution = url.resolve(opts.config.host, opts.basePath + 'attribution');

  // OPTIONAL. Default: null. The query that has been issued to trigger the
  // search.
  // Freeform object.
  // This is the equivalent of how the engine interpreted the incoming request.
  // Helpful for debugging and understanding how the input impacts results.
  res.body.geocoding.query = req.clean;

  // remove arrays produced by the tokenizer (only intended to be used internally).
  delete res.body.geocoding.query.tokens_complete;
  delete res.body.geocoding.query.tokens_incomplete;

  // OPTIONAL. Warnings and errors.
  addMessages(req, 'warnings', res.body.geocoding);
  addMessages(req, 'errors', res.body.geocoding);

  // OPTIONAL
  // Freeform
  addEngine(opts.config.version, res.body.geocoding);

  // response envelope
  res.body.geocoding.timestamp = new Date().getTime();

  // convert docs to geojson and merge with geocoding block
  extend(res.body, geojsonify(req.clean, res.data || []));

  next();
*/
}

function addMessages(req, msgType, geocoding) {
  if (req.hasOwnProperty(msgType) && req[msgType].length) {
    // cleanup arrays to make sure there are no duplicates
    geocoding[msgType] = _.uniq(req[msgType]);
  }
}

function addEngine(version, geocoding) {
  geocoding.engine = {
    name: 'Pelias',
    author: 'Mapzen',
    version: version
  };
}

module.exports = setup;
