import type { LatLng, Stop } from "@/types";

export interface RouteAnnotatedStop extends Stop {
  routeDistanceMiles: number;
  nearestSegmentIndex: number;
}

const DEG_TO_RAD = Math.PI / 180;
const MILES_PER_DEG_LAT = 69.0;

export function pointToSegmentDistance(
  point: LatLng,
  segStart: LatLng,
  segEnd: LatLng,
): number {
  const cosLat = Math.cos(((segStart.lat + segEnd.lat) / 2) * DEG_TO_RAD);
  const milesPerDegLng = MILES_PER_DEG_LAT * cosLat;

  const px = (point.lng - segStart.lng) * milesPerDegLng;
  const py = (point.lat - segStart.lat) * MILES_PER_DEG_LAT;
  const sx = 0;
  const sy = 0;
  const ex = (segEnd.lng - segStart.lng) * milesPerDegLng;
  const ey = (segEnd.lat - segStart.lat) * MILES_PER_DEG_LAT;

  const dx = ex - sx;
  const dy = ey - sy;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  const projX = sx + t * dx;
  const projY = sy + t * dy;

  const distX = px - projX;
  const distY = py - projY;
  return Math.sqrt(distX * distX + distY * distY);
}

export function filterByRouteCorridor(
  stops: Stop[],
  routePoints: LatLng[],
  corridorWidthMiles: number = 5,
): RouteAnnotatedStop[] {
  if (routePoints.length < 2) return [];

  const sampleInterval = Math.max(1, Math.floor(routePoints.length / 200));
  const sampledIndices: number[] = [];
  for (let i = 0; i < routePoints.length - 1; i += sampleInterval) {
    sampledIndices.push(i);
  }
  if (sampledIndices[sampledIndices.length - 1] !== routePoints.length - 2) {
    sampledIndices.push(routePoints.length - 2);
  }

  const results: RouteAnnotatedStop[] = [];

  for (const stop of stops) {
    let minDist = Infinity;
    let nearestIdx = 0;

    for (const i of sampledIndices) {
      const dist = pointToSegmentDistance(
        stop.location.latLng,
        routePoints[i],
        routePoints[Math.min(i + sampleInterval, routePoints.length - 1)],
      );
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    if (minDist <= corridorWidthMiles) {
      results.push({
        ...stop,
        routeDistanceMiles: minDist,
        nearestSegmentIndex: nearestIdx,
      });
    }
  }

  return results;
}

export function computeRouteProgressScore(
  nearestSegmentIndex: number,
  currentSegmentIndex: number,
  totalSegments: number,
): number {
  if (totalSegments <= 0) return 0.5;

  const delta = (nearestSegmentIndex - currentSegmentIndex) / totalSegments;

  const optimalDelta = 0.08;

  if (delta < -0.02) {
    return Math.max(0, 0.3 + delta * 2);
  }

  const diff = delta - optimalDelta;
  return Math.max(0, Math.min(1, Math.exp(-8 * diff * diff)));
}

export function computeRouteProximityScore(
  routeDistanceMiles: number,
  corridorWidthMiles: number,
): number {
  if (corridorWidthMiles <= 0) return 0;
  return Math.max(0, 1 - routeDistanceMiles / corridorWidthMiles);
}

export function computeRouteScore(
  routeDistanceMiles: number,
  corridorWidthMiles: number,
  nearestSegmentIndex: number,
  currentSegmentIndex: number,
  totalSegments: number,
): number {
  const proximity = computeRouteProximityScore(routeDistanceMiles, corridorWidthMiles);
  const progress = computeRouteProgressScore(nearestSegmentIndex, currentSegmentIndex, totalSegments);
  return 0.6 * proximity + 0.4 * progress;
}
