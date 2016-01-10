'use strict';

const _ = require('lodash');
const d3 = require('d3');
const poly = require('d3-polygon');

module.exports = function () {
  const geo = require('../../data/AQ.json');
  const cities = require('../../data/AQ_cities.json');

  const width = 388;
  const height = width;
  const r = 3;

  // Orthographic projection rotated and scaled for Antarctica
  const projection = d3.geo.orthographic()
    .scale(400)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .rotate([0, 90]);

  // Collection of polygons projected
  const hulls = geo.geometry.coordinates
    .map((coords) => coords[0].map(projection));

  let circles = [];
  for (let i = r; i < width; i += 2 * r) {
    for (let j = r; j < height; j += 2 * r) {
      let p = [i, j];

      if (_.some(hulls, (h) => poly.inside(h, p))) {
        circles.push({
          'x': p[0],
          'y': p[1],
          'r': r,
        });
      }
    }
  }

  const suffixes = cities.geonames.map((city) => {
      const p = projection([city.lng, city.lat]);
      const suffix = '-' + city.name.slice(-6);

      // Brute force search for the dot in the grid that is nearest to
      // this city. Also duplicates each dot from the master grid so that
      // so that subsequent cities don't tromp all over it.
      let delta = Infinity;
      let winner = null;
      let dots = circles.map((c) => {
        let a = c.x - p[0];
        let b = c.y - p[1];
        let dist = Math.sqrt(a*a + b*b);

        let d = {
          'x': c.x,
          'y': c.y,
          'r': r
        };

        if (dist < delta) {
          delta = dist;
          winner = d;
        }

        return d;
      });

      winner.name = city.name;
      winner.className = 'city';

      return {
        'suffix': suffix,
        'circles': dots,
      };
    })
    .sort((a, b) => d3.ascending(a.suffix, b.suffix));

  return {
    'suffixes': suffixes
  };
};
