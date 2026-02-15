"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import { STOP_CATEGORY_CONFIG } from "@/lib/constants";
import type { Stop } from "@/types";

interface StopMarkersProps {
  stops: Stop[];
  type: "scheduled" | "recommended";
}

export default function StopMarkers({ stops, type }: StopMarkersProps) {
  return (
    <>
      {stops.map((stop) => {
        const config = STOP_CATEGORY_CONFIG[stop.category];
        return (
          <CircleMarker
            key={stop.id}
            center={[stop.location.latLng.lat, stop.location.latLng.lng]}
            radius={type === "scheduled" ? 10 : 7}
            pathOptions={{
              color: type === "scheduled" ? "#1c1917" : "#a8a29e",
              fillColor: config.color,
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="text-xs font-medium">{stop.name}</span>
              <br />
              <span className="text-xs text-stone-500">{config.label}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
