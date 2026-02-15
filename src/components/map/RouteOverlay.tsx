"use client";

import { Polyline } from "react-leaflet";
import { ROUTE_ACTIVE_COLOR } from "@/lib/constants";
import { decodePolyline } from "@/lib/utils";
import type { LatLngTuple } from "leaflet";

interface RouteOverlayProps {
  encodedPath: string;
}

export default function RouteOverlay({ encodedPath }: RouteOverlayProps) {
  const positions: LatLngTuple[] = decodePolyline(encodedPath).map((p) => [
    p.lat,
    p.lng,
  ]);

  if (positions.length === 0) return null;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: ROUTE_ACTIVE_COLOR,
        weight: 5,
        opacity: 0.8,
      }}
    />
  );
}
