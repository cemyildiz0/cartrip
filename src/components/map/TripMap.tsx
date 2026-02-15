"use client";

import dynamic from "next/dynamic";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import { useTripStore } from "@/store/tripStore";

const MapInner = dynamic(() => import("./MapInner"), { ssr: false });

export default function TripMap() {
  const route = useTripStore((s) => s.route);
  const scheduledStops = useTripStore((s) => s.scheduledStops);
  const recommendations = useTripStore((s) => s.recommendations);

  const recommendedStops = recommendations
    .filter((r) => !r.dismissed)
    .flatMap((r) => r.stops);

  return (
    <MapInner
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      route={route}
      scheduledStops={scheduledStops}
      recommendedStops={recommendedStops}
    />
  );
}
