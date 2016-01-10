'use strict';

const _ = require('lodash');
const $ = require('gulp-load-plugins')();
const del = require('del');
const fs = require('fs');
const gulp = require('gulp');
const http = require('http');
const path = require('path');
const q = require('q');
const querystring = require('querystring');
const shapefile = require('shapefile');
const unzip = require('unzip');

const app = require('./src/js/index.js');

const GEONAMES = 'api.geonames.org';
const GEOUSER = '?username=demo&';

/**
 * Fetch data from api.geonames.org
 *
 * @return a promise that is resolved with the body of the HTTP response
 * as a String.
 */
function fetch(path) {
  const deferred = q.defer();
  const options = {
    'host': GEONAMES,
    'path': path
  };

  let body = '';

  $.util.log('Fetching', $.util.colors.cyan(path));

  http.get(options, (res) => {
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      deferred.resolve(body);
    });
    res.on('error', (e) => {
      deferred.reject(new Error(e));
    })
  });

  return deferred.promise;
}

/**
 * Fetch country info JSON data from geonames.org
 *
 * The country JSON is written to data/countries.json as well as parsed
 * and returned in a promise.
 *
 * @return a promise resolved with an array of city objects
 */
function fetchCountryInfo() {
  return fetch('/countryInfoJSON' + GEOUSER + 'country=AQ')
    .then((body) => {
      let info = JSON.parse(body);

      $.util.log('Write', $.util.colors.cyan('data/countries.json'));
      fs.writeFileSync('data/countries.json', body);

      return info.geonames;
    });
}

/**
 * Fetch city info for a list of countries from geonames.org
 *
 * Writes each collection of cities to data/<countrycode>.json as well
 * as returning a promise that resolves with an array of each parsed
 * response.
 *
 * @return a promise resolved with an array of all response objects
 */
function fetchCities(countries) {
  return q.all(countries.map((country) => {
    const bbox = _.pick(country, 'north', 'south', 'east', 'west');
    const path = '/citiesJSON' + GEOUSER + querystring.stringify(bbox)
    const citiesFile = 'data/' + country.countryCode + '_cities.json';

    return fetch(path)
      .then((body) => {
        $.util.log('Writing', $.util.colors.cyan(citiesFile));
        fs.writeFileSync(citiesFile, body);
      });
  }));
}

/**
 * Fetch shape data from naturalearthdata.com and convert it geojson
 *
 * @return a promise (resolved with nothing)
 */
function fetchShapes() {
  const deferred = q.defer();
  const options = {
    'host': 'naciscdn.org',
    'path': '/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip'
  };

  $.util.log('Fetching', $.util.colors.cyan(options.path));

  http.get(options, (res) => {
    res.pipe(unzip.Extract({ path: 'data/' }))
      .on('finish', () => {
        $.util.log('Writing', $.util.colors.cyan('AQ.json'));

        shapefile.read('data/ne_110m_admin_0_countries', (err, coll) => {
          if (err) {
            deferred.reject(new Error(err));
          } else {
            // Filter out countries except antarctica
            let feature = _.find(coll.features, (f) => f.properties.postal === 'AQ');
            fs.writeFileSync('data/AQ.json', JSON.stringify(feature));
            deferred.resolve();
          }
        });
      });
  });

  return deferred.promise;
}

gulp.task('data', function (cb) {
  try {
    fs.statSync('data');
  } catch (e) {
    $.util.log('mkdir data/');
    fs.mkdirSync('data');
  }

  q.all([fetchShapes(), fetchCountryInfo().then(fetchCities)])
    .then(() => {
      $.util.log('Fetched all data');
      cb();
    })
    .catch((err) => {
      $.util.log($.util.color.red('ERR:'), 'Failed to load data', err);
    });
});

gulp.task('build', function () {
  gulp.src('./src/mustache/*.mustache')
    .pipe($.mustache(app()))
    .pipe($.rename('index.html'))
    .pipe(gulp.dest('.'));
});

gulp.task('clean', function () {
  return del(['data/', 'index.html']);
});

gulp.task('default', ['build']);

gulp.task('all', ['data', 'build']);
