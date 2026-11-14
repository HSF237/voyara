import { geoEquirectangular, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import { latLngToVec3 } from './math';

const MASK_WIDTH = 1024;
const MASK_HEIGHT = 512;

/**
 * Positions for the dots that draw the continents.
 *
 * Land outlines (Natural Earth, public domain) are painted into an off-screen
 * canvas as a black/white mask. Evenly spaced points on the sphere are then
 * kept only where the mask says "land". One pixel lookup per point is far
 * cheaper than testing each point against the coastline polygons.
 */
export function buildLandPoints(stepDegrees = 1.3): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new Float32Array();

  const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topology, topology.objects.land) as FeatureCollection;
  const projection = geoEquirectangular().fitSize([MASK_WIDTH, MASK_HEIGHT], { type: 'Sphere' });
  context.fillStyle = '#fff';
  context.beginPath();
  geoPath(projection, context)(land);
  context.fill();
  const mask = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;

  const points: number[] = [];
  let row = 0;
  for (let lat = -84; lat <= 84; lat += stepDegrees, row += 1) {
    // Fewer dots per row near the poles keeps the spacing even.
    const count = Math.max(1, Math.round((360 / stepDegrees) * Math.cos((lat * Math.PI) / 180)));
    const stagger = row % 2 === 0 ? 0 : 0.5;
    for (let index = 0; index < count; index += 1) {
      const lng = -180 + ((index + stagger) * 360) / count;
      const x = Math.min(MASK_WIDTH - 1, Math.floor(((lng + 180) / 360) * MASK_WIDTH));
      const y = Math.min(MASK_HEIGHT - 1, Math.floor(((90 - lat) / 180) * MASK_HEIGHT));
      if ((mask[(y * MASK_WIDTH + x) * 4 + 3] ?? 0) > 127) {
        points.push(...latLngToVec3(lat, lng, 1.004));
      }
    }
  }
  return new Float32Array(points);
}
