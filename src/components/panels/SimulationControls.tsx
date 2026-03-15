"use client";

import { Play, Pause, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTripStore } from "@/store/tripStore";
import { useUserStore } from "@/store/userStore";
import { createSimulation, type Simulation } from "@/lib/simulation";
import { getRecommendations } from "@/lib/recommendation";
import { calculateRemainingRange, getTimeOfDay, formatDuration } from "@/lib/utils";
import { SIMULATION_TICK_MS } from "@/lib/constants";
import { useRef, useCallback } from "react";

const SPEED_OPTIONS = [
  { value: "1", label: "1x" },
  { value: "5", label: "5x" },
  { value: "10", label: "10x" },
  { value: "50", label: "50x" },
];

async function fetchPlacesForPosition(lat: number, lng: number) {
  const radius = 8047;
  const [fuelRes, restRes, hotelRes, restaurantRes] = await Promise.all([
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=fuel&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=rest&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=hotel&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=restaurant&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
  ]);
  return {
    gasStations: fuelRes.stops ?? [],
    restStops: restRes.stops ?? [],
    hotels: hotelRes.stops ?? [],
    restaurants: restaurantRes.stops ?? [],
  };
}

export default function SimulationControls() {
  const route = useTripStore((s) => s.route);
  const simulation = useTripStore((s) => s.simulation);
  const context = useTripStore((s) => s.context);
  const setSimulation = useTripStore((s) => s.setSimulation);
  const setSimulationInterval = useTripStore((s) => s.setSimulationInterval);
  const stopSimulation = useTripStore((s) => s.stopSimulation);
  const updateContext = useTripStore((s) => s.updateContext);
  const addRecommendations = useTripStore((s) => s.addRecommendations);
  const clearRecommendations = useTripStore((s) => s.clearRecommendations);
  const vehicle = useUserStore((s) => s.vehicle);
  const preferences = useUserStore((s) => s.preferences);

  const simRef = useRef<Simulation | null>(null);
  const speedRef = useRef(10);
  const isFetchingRef = useRef(false);

  const startSim = useCallback(() => {
    if (!route) return;

    const sim = createSimulation({
      route,
      vehicle,
      preferences,
      speedMultiplier: speedRef.current,
      startTime: new Date(),
    });
    simRef.current = sim;

    const routePoints = sim.getRoutePoints();
    setSimulation({
      isRunning: true,
      speed: speedRef.current,
      simulatedTime: new Date(),
      positionIndex: 0,
      routePoints,
    });

    const intervalId = window.setInterval(() => {
      const currentSim = simRef.current;
      if (!currentSim || currentSim.isComplete()) {
        useTripStore.getState().stopSimulation();
        return;
      }

      const tick = currentSim.tick();

      updateContext({
        currentPosition: tick.position,
        currentSegmentIndex: tick.segmentIndex,
        elapsedDrivingMinutes: tick.elapsedMinutes,
        estimatedFuelRemaining: tick.fuelRemaining,
        distanceTraveledMiles: tick.distanceTraveledMiles,
        timeOfDay: getTimeOfDay(tick.simulatedTime),
        minutesSinceLastStop: tick.elapsedMinutes,
      });

      setSimulation({
        isRunning: true,
        speed: speedRef.current,
        simulatedTime: tick.simulatedTime,
        positionIndex: tick.segmentIndex,
        routePoints,
      });

      if (tick.shouldFetchPlaces && tick.triggers.length > 0 && !isFetchingRef.current) {
        isFetchingRef.current = true;
        const fuelRange = calculateRemainingRange({
          ...vehicle,
          currentFuelLevel: tick.fuelRemaining,
        });

        fetchPlacesForPosition(tick.position.lat, tick.position.lng)
          .then((stops) => {
            const state = useTripStore.getState();
            const recs = getRecommendations({
              currentPosition: tick.position,
              fuelRangeMiles: fuelRange,
              tripContext: {
                ...state.context,
                currentPosition: tick.position,
                estimatedFuelRemaining: tick.fuelRemaining,
                elapsedDrivingMinutes: tick.elapsedMinutes,
              },
              preferences,
              routeData: route,
              weather: null,
              currentTime: tick.simulatedTime,
              stops,
            });

            if (recs.length > 0) {
              addRecommendations(recs);
            }
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      }
    }, SIMULATION_TICK_MS);

    setSimulationInterval(intervalId);
  }, [route, vehicle, preferences, setSimulation, setSimulationInterval, updateContext, addRecommendations]);

  const toggleSim = useCallback(() => {
    if (simulation?.isRunning) {
      stopSimulation();
    } else {
      startSim();
    }
  }, [simulation, stopSimulation, startSim]);

  const resetSim = useCallback(() => {
    stopSimulation();
    clearRecommendations();
    setSimulation(null);
    simRef.current = null;
    updateContext({
      elapsedDrivingMinutes: 0,
      estimatedFuelRemaining: vehicle.currentFuelLevel,
      distanceTraveledMiles: 0,
      currentPosition: null,
      currentSegmentIndex: 0,
      minutesSinceLastStop: 0,
    });
  }, [stopSimulation, clearRecommendations, setSimulation, updateContext, vehicle]);

  if (!route) return null;

  const progress = simulation
    ? Math.min(100, (simulation.positionIndex / Math.max(1, simulation.routePoints.length - 1)) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Simulation
        </h3>
        {simulation?.simulatedTime && (
          <span className="text-xs text-stone-500">
            {simulation.simulatedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="w-full bg-stone-200 rounded-full h-1.5 mb-3">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={simulation?.isRunning ? "outline" : "primary"}
          onClick={toggleSim}
          className="flex-shrink-0"
        >
          {simulation?.isRunning ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        <select
          value={String(speedRef.current)}
          onChange={(e) => {
            speedRef.current = Number(e.target.value);
            if (simulation) {
              setSimulation({ ...simulation, speed: speedRef.current });
            }
          }}
          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex-1 text-xs text-stone-500 text-right">
          {context.elapsedDrivingMinutes > 0 && formatDuration(context.elapsedDrivingMinutes)}
        </div>

        <Button size="sm" variant="ghost" onClick={resetSim} className="flex-shrink-0">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
