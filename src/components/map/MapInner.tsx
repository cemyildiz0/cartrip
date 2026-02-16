"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, Location, RouteData, Stop } from "@/types";
import RouteOverlay from "./RouteOverlay";
import StopMarkers from "./StopMarkers";
import L from "leaflet";
import { useEffect, useMemo } from "react";

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    tooltipAnchor: [0, -40],
  });
}

interface MapInnerProps {
  center: LatLng;
  zoom: number;
  route: RouteData | null;
  origin: Location | null;
  destination: Location | null;
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
  origin,
  destination,
  scheduledStops,
  recommendedStops,
}: MapInnerProps) {
  const originIcon = useMemo(() => createPinIcon("#16a34a"), []);
  const destinationIcon = useMemo(() => createPinIcon("#dc2626"), []);

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
      {origin && (
        <Marker
          position={[origin.latLng.lat, origin.latLng.lng]}
          icon={originIcon}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span className="text-xs font-medium">{origin.address}</span>
            <br />
            <span className="text-xs text-stone-500">Starting Point</span>
          </Tooltip>
        </Marker>
      )}
      {destination && (
        <Marker
          position={[destination.latLng.lat, destination.latLng.lng]}
          icon={destinationIcon}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span className="text-xs font-medium">{destination.address}</span>
            <br />
            <span className="text-xs text-stone-500">Destination</span>
          </Tooltip>
        </Marker>
      )}
      <StopMarkers stops={scheduledStops} type="scheduled" />
      <StopMarkers stops={recommendedStops} type="recommended" />
    </MapContainer>
  );
}
