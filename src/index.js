import * as turf from "@turf/turf";
import { Map, View } from "ol";
import { Vector as VectorLayer, Tile as TileLayer } from "ol/layer.js";
import { OSM, Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import { extractGridCounts, getColor } from "./utils";
import data from "./data.json";
import "normalize.css";

/*

Grid Setup

*/

const bbox = [-79.63, 43.59, -79.13, 43.89];
const cellSide = 1;
const options = { units: "kilometers" };
const grid = turf.hexGrid(bbox, cellSide, options);
for (let [k, v] of Object.entries(grid.features)) {
  grid.features[k].properties = {
    ...grid.features[k].properties,
    id: parseInt(k) + 1,
    count: 0
  };
}

/*

Count Points in Grid

*/

/* @typedef {Point[]} points */
const points = [];
data.features.forEach(({ properties, geometry: { type, coordinates } }) => {
  const [lon, lat] = coordinates;
  points.push(turf.point([lon, lat]));
});

// iterate through grid hexagons
for (let [k, v] of Object.entries(grid.features)) {
  let poly = turf.polygon(grid.features[k].geometry.coordinates);

  // iterate through each dataset coordinate
  for (let j = 0; j < points.length; j++) {
    let currPoint = points[j];
    let isPointInPolygon = turf.booleanPointInPolygon(currPoint, poly);
    if (!!isPointInPolygon) {
      grid.features[k].properties = {
        ...grid.features[k].properties,
        count: grid.features[k].properties.count + 1
      };
    }
  }
}

// colour generator
const gridCounts = extractGridCounts(grid);
const colorHandler = getColor(gridCounts);

/*

Open Layers

*/

function polygonStyleFunction(feature, resolution) {
  const count = feature.get("count");
  const color = colorHandler(count);

  return new Style({
    stroke: new Stroke({
      color: "black",
      width: 1
    }),
    fill: new Fill({
      color: color
    })
  });
}

const geojsonFormatter = new GeoJSON();

const gridVectorSource = new VectorSource({
  features: geojsonFormatter.readFeatures(grid, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857"
  })
});

const gridVectorLayer = new VectorLayer({
  source: gridVectorSource,
  style: polygonStyleFunction
});

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    gridVectorLayer
  ],
  target: "map",
  view: new View({
    center: fromLonLat([-79.3871, 43.6426]),
    zoom: 11
  })
});
