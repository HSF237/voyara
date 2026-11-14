const RAD = Math.PI / 180;

export type Vec3 = [number, number, number];

/**
 * Latitude/longitude → a point on a sphere. Longitude 0 faces the camera
 * (+z), east is to the right (+x), north is up (+y).
 */
export function latLngToVec3(lat: number, lng: number, radius = 1): Vec3 {
  const phi = lat * RAD;
  const lambda = lng * RAD;
  return [
    radius * Math.cos(phi) * Math.sin(lambda),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(lambda),
  ];
}

/** Globe rotation (radians) that brings a place to the front, tilted slightly toward the viewer. */
export function rotationFacing(lat: number, lng: number): { yaw: number; pitch: number } {
  const pitch = Math.max(-0.9, Math.min(0.9, lat * RAD * 0.8));
  return { yaw: -lng * RAD, pitch };
}

/** Smallest signed angle from `from` to `to`, so the globe never spins the long way round. */
export function shortestAngle(from: number, to: number): number {
  const turn = Math.PI * 2;
  return ((((to - from) % turn) + turn + Math.PI) % turn) - Math.PI;
}

/**
 * Points along a great-circle arc between two places, lifted off the surface
 * in the middle like a flight path. Longer routes fly higher.
 */
export function arcPoints(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  segments = 48,
): Vec3[] {
  const a = latLngToVec3(from.lat, from.lng);
  const b = latLngToVec3(to.lat, to.lng);
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const angle = Math.acos(dot);
  const sin = Math.sin(angle) || 1;
  const lift = 0.06 + angle * 0.16;

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const wa = Math.sin((1 - t) * angle) / sin;
    const wb = Math.sin(t * angle) / sin;
    const height = 1 + Math.sin(Math.PI * t) * lift;
    return [
      (a[0] * wa + b[0] * wb) * height,
      (a[1] * wa + b[1] * wb) * height,
      (a[2] * wa + b[2] * wb) * height,
    ] as Vec3;
  });
}
