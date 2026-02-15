"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, RouteData, Stop } from "@/types";
import RouteOverlay from "./RouteOverlay";
import StopMarkers from "./StopMarkers";
import L from "leaflet";
import { useEffect } from "react";

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapInnerProps {
  center: LatLng;
  zoom: number;
  route: RouteData | null;
  scheduledStops: Stop[];
  recommendedStops: Stop[];
}

function FitRouteBounds({ route }: { route: RouteData | null }) {
  const map = useMap();

  useEffect(() => {
    if (!route) return;
    const { northeast, southwest } = route.bounds;
    const bounds = L.latLngBounds(
      [southwest.lat, southwest.lng],
      [northeast.lat, northeast.lng],
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [route, map]);

  return null;
}

export default function MapInner({
  center,
  zoom,
  route,
  scheduledStops,
  recommendedStops,
}: MapInnerProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRouteBounds route={route} />
      {route && <RouteOverlay encodedPath={route.polyline} />}
      <StopMarkers stops={scheduledStops} type="scheduled" />
      <StopMarkers stops={recommendedStops} type="recommended" />
    </MapContainer>
  );
}
