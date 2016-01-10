'use strict';

const _ = require('lodash');
const d3 = require('d3');
const poly = require('d3-polygon');
const scale = require('d3-scale');

module.exports = function () {
  const geo = require('../../data/AQ.json');
  const cities = require('../../data/AQ_cities.json');

  const width = 400;
  const height = width;
  const r = 2;

  // Orthographic projection rotated and scaled for Antarctica
  const projection = d3.geo.orthographic()
    .scale(410)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .rotate([0, 90]);

  // Collection of polygons projected
  const hulls = geo.geometry.coordinates
    .map((coords) => coords[0].map(projection));

  const fill = scale.scaleMagma();
  const path = d3.geo.path().projection(projection);

  let circles = [];
  for (let i = r; i < width; i += 2 * r) {
    for (let j = r; j < height; j += 2 * r) {
      let p = [i, j];

      if (_.some(hulls, (h) => poly.inside(h, p))) {
        circles.push({
          'x': p[0],
          'y': p[1],
          'r': r,
          'fill': fill(1)
        });
      }
    }
  }

  const suffixes = cities.geonames.map((city) => {
      const p = projection([city.lng, city.lat]);
      const suffix = '-' + city.name.slice(-6);

      return {
        'suffix': suffix,
        'circles': _.cloneDeep(circles),
        'city': {
          'name': city.name,
          'x': p[0],
          'y': p[1],
          'r': r,
          'fill': fill(0.5)
        }
      };
    })
    .sort((a, b) => d3.ascending(a.suffix, b.suffix));

  return {
    'suffixes': suffixes
  };
};
