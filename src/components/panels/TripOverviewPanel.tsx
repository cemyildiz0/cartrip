"use client";

import { Route, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useTripStore } from "@/store/tripStore";
import { useUserStore } from "@/store/userStore";
import {
  calculateRemainingRange,
  formatDistance,
  formatDuration,
} from "@/lib/utils";
import { STOP_CATEGORY_CONFIG } from "@/lib/constants";
import type { StopCategory } from "@/types";

export default function TripOverviewPanel() {
  const route = useTripStore((s) => s.route);
  const origin = useTripStore((s) => s.origin);
  const destination = useTripStore((s) => s.destination);
  const status = useTripStore((s) => s.status);
  const context = useTripStore((s) => s.context);
  const scheduledStops = useTripStore((s) => s.scheduledStops);
  const removeScheduledStop = useTripStore((s) => s.removeScheduledStop);
  const startTrip = useTripStore((s) => s.startTrip);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const vehicle = useUserStore((s) => s.vehicle);

  const remainingRange = calculateRemainingRange(vehicle);

  if (!route) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <Route className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-500">No route yet</p>
          <p className="text-xs text-stone-400 mt-1">
            Plan a route to see your trip overview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 md:pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Trip Overview</h2>
        {status === "planning" && (
          <Button size="sm" variant="ghost" onClick={resetTrip}>
            Reset
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="font-medium text-stone-800 truncate">
              {origin?.address || "Origin"}
            </span>
          </div>
          <div className="ml-[3px] border-l border-dashed border-stone-200 h-3" />
          <div className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
            <span className="font-medium text-stone-800 truncate">
              {destination?.address || "Destination"}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-500">
          <span>{formatDistance(route.totalDistanceMiles)}</span>
          <span className="text-stone-300">·</span>
          <span>{formatDuration(route.totalDurationMinutes)}</span>
          <span className="text-stone-300">·</span>
          <span>~{formatDistance(remainingRange)} range</span>
        </div>
      </Card>

      {status === "active" && (
        <Card className="bg-brand-50 border-brand-200">
          <h3 className="text-xs font-semibold text-brand-800 uppercase tracking-wide mb-2">
            Live Trip Data
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-brand-500">Driving Time</span>
              <p className="font-semibold text-brand-900 mt-0.5">
                {formatDuration(context.elapsedDrivingMinutes)}
              </p>
            </div>
            <div>
              <span className="text-brand-500">Distance</span>
              <p className="font-semibold text-brand-900 mt-0.5">
                {formatDistance(context.distanceTraveledMiles)}
              </p>
            </div>
            <div>
              <span className="text-brand-500">Fuel</span>
              <p className="font-semibold text-brand-900 mt-0.5">
                {Math.round(context.estimatedFuelRemaining * 100)}%
              </p>
            </div>
            <div>
              <span className="text-brand-500">Remaining</span>
              <p className="font-semibold text-brand-900 mt-0.5">
                {formatDistance(context.estimatedMilesRemaining)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Scheduled Stops ({scheduledStops.length})
        </h3>
        {scheduledStops.length === 0 ? (
          <p className="text-xs text-stone-400 py-2">
            No stops added yet. Recommendations will appear as you travel.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {scheduledStops.map((stop, index) => {
              const config =
                STOP_CATEGORY_CONFIG[stop.category as StopCategory];
              return (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {stop.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {config.label} ·{" "}
                      {formatDistance(stop.detourDistanceMiles)} detour
                    </p>
                  </div>
                  <button
                    onClick={() => removeScheduledStop(stop.id)}
                    className="rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {status === "planning" && (
        <Button onClick={startTrip} size="lg" className="w-full mt-auto">
          Start Trip
        </Button>
      )}
    </div>
  );
}
