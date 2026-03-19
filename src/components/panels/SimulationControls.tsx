"use client";

import { Play, Pause, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTripStore } from "@/store/tripStore";
import { useUserStore } from "@/store/userStore";
import { createSimulation, type Simulation } from "@/lib/simulation";
import { getRecommendations } from "@/lib/recommendation";
import { calculateRemainingRange, getTimeOfDay, formatDuration } from "@/lib/utils";
import {
  SIMULATION_TICK_MS,
  FUEL_WARNING_THRESHOLD,
  MEAL_TIMES,
  MEAL_RETRIGGER_COOLDOWN_MINUTES,
  EVENING_LODGING_HOUR,
  PLACE_FETCH_THRESHOLD_MILES,
  MIN_MEAL_SPACING_MINUTES,
  MIN_DRIVING_BEFORE_MEAL_MINUTES,
  MIN_DRIVING_BEFORE_HOTEL_MINUTES,
  HOTEL_MIN_REMAINING_DISTANCE_MILES,
  HOTEL_RETRIGGER_COOLDOWN_MINUTES,
} from "@/lib/constants";
import type { WeatherData } from "@/types";
import { useCallback, useEffect } from "react";

const SPEED_OPTIONS = [
  { value: "1", label: "1x" },
  { value: "5", label: "5x" },
  { value: "10", label: "10x" },
  { value: "50", label: "50x" },
];

// Module-level refs survive component unmount/remount (e.g. when switching tabs)
let simRef: Simulation | null = null;
const speedRef = { current: 10 };
let isFetchingRef = false;
let lastTriggeredFetchMiles = 0;
let hotelRecommendedThisNight = false;

function getMealSlotForHour(hour: number): "breakfast" | "lunch" | "dinner" | null {
  for (const [mealName, window] of Object.entries(MEAL_TIMES)) {
    if (hour >= window.start && hour <= window.end) {
      return mealName as "breakfast" | "lunch" | "dinner";
    }
  }
  return null;
}

async function fetchPlacesAndWeather(lat: number, lng: number) {
  const radius = 8047;
  const [fuelRes, restRes, hotelRes, restaurantRes, weatherRes] = await Promise.all([
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=fuel&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=rest&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=hotel&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=restaurant&radius=${radius}`).then((r) => r.json()).catch(() => ({ stops: [] })),
    fetch(`/api/weather?lat=${lat}&lng=${lng}`).then((r) => r.json()).catch(() => ({ weather: null })),
  ]);
  return {
    stops: {
      gasStations: fuelRes.stops ?? [],
      restStops: restRes.stops ?? [],
      hotels: hotelRes.stops ?? [],
      restaurants: restaurantRes.stops ?? [],
    },
    weather: (weatherRes.weather as WeatherData) ?? null,
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
  const simPausedForRecs = useTripStore((s) => s.simPausedForRecs);
  const simShouldResume = useTripStore((s) => s.simShouldResume);
  const clearSimShouldResume = useTripStore((s) => s.clearSimShouldResume);
  const vehicle = useUserStore((s) => s.vehicle);
  const preferences = useUserStore((s) => s.preferences);

  // simRef, speedRef, isFetchingRef are module-level (above)

  const startSim = useCallback((resume = false) => {
    if (!route) return;

    // Prevent double-start
    const currentState = useTripStore.getState();
    if (currentState.simulationIntervalId) return;

    const previousSimState = resume && simRef
      ? simRef.getState()
      : undefined;
    const resumeState = previousSimState
      ? {
          ...previousSimState,
          fuelRemaining: useTripStore.getState().context.estimatedFuelRemaining,
        }
      : undefined;

    // Set lastTriggeredFetchMiles so we don't re-trigger immediately on resume
    if (resumeState) {
      lastTriggeredFetchMiles = resumeState.distanceTraveledMiles;
    }

    const sim = createSimulation({
      route,
      vehicle,
      preferences,
      speedRef,
      startTime: new Date(),
      resumeState,
    });
    simRef = sim;

    const routePoints = sim.getRoutePoints();
    const initialPositionIndex = resumeState?.positionIndex ?? 0;
    const initialFuelRemaining = resumeState?.fuelRemaining ?? vehicle.currentFuelLevel;
    const initialDistanceTraveled = resumeState?.distanceTraveledMiles ?? 0;
    const initialElapsedMinutes = resumeState?.elapsedMinutes ?? 0;
    const initialTime = new Date(Date.now() + initialElapsedMinutes * 60 * 1000);

    updateContext({
      currentPosition: routePoints[initialPositionIndex] ?? null,
      currentSegmentIndex: initialPositionIndex,
      elapsedDrivingMinutes: initialElapsedMinutes,
      estimatedFuelRemaining: initialFuelRemaining,
      distanceTraveledMiles: initialDistanceTraveled,
      estimatedMilesRemaining: Math.max(0, route.totalDistanceMiles - initialDistanceTraveled),
      timeOfDay: getTimeOfDay(initialTime),
    });

    setSimulation({
      isRunning: true,
      speed: speedRef.current,
      simulatedTime: initialTime,
      positionIndex: initialPositionIndex,
      routePoints,
    });

    const intervalId = window.setInterval(() => {
      const currentSim = simRef;
      if (!currentSim || currentSim.isComplete()) {
        useTripStore.getState().stopSimulation();
        useTripStore.getState().endTrip();
        return;
      }

      // Freeze sim while fetching — prevents advancing during async API call
      if (isFetchingRef) return;

      // Sync refuel from store (user accepted a gas station)
      const storeFuel = useTripStore.getState().context.estimatedFuelRemaining;
      const simState = currentSim.getState();
      if (storeFuel > simState.fuelRemaining + 0.01) {
        currentSim.refuel(storeFuel);
      }

      const tick = currentSim.tick();

      const prevContext = useTripStore.getState().context;
      const lastStopTime = prevContext.lastStopTime;
      const minutesSinceLastStop = lastStopTime
        ? (tick.simulatedTime.getTime() - lastStopTime.getTime()) / 60000
        : tick.elapsedMinutes;

      updateContext({
        currentPosition: tick.position,
        currentSegmentIndex: tick.segmentIndex,
        elapsedDrivingMinutes: tick.elapsedMinutes,
        estimatedFuelRemaining: tick.fuelRemaining,
        distanceTraveledMiles: tick.distanceTraveledMiles,
        estimatedMilesRemaining: Math.max(0, (route?.totalDistanceMiles ?? 0) - tick.distanceTraveledMiles),
        timeOfDay: getTimeOfDay(tick.simulatedTime),
        minutesSinceLastStop,
      });

      setSimulation({
        isRunning: true,
        speed: speedRef.current,
        simulatedTime: tick.simulatedTime,
        positionIndex: tick.segmentIndex,
        routePoints,
      });

      // Check triggers synchronously — only fetch when conditions warrant a stop
      const distSinceLastFetch = tick.distanceTraveledMiles - lastTriggeredFetchMiles;
      const hour = tick.simulatedTime.getHours();

      // Reset hotel flag when daytime returns (new night = new chance)
      if (hour >= 5 && hour < EVENING_LODGING_HOUR) {
        hotelRecommendedThisNight = false;
      }

      if (distSinceLastFetch >= PLACE_FETCH_THRESHOLD_MILES) {
        const fuelThreshold = Math.max(FUEL_WARNING_THRESHOLD, vehicle.safetyBufferPercent + 0.10);
        const currentContext = useTripStore.getState().context;
        const currentMealSlot = getMealSlotForHour(hour);
        const minutesSinceLastMeal = currentContext.lastMealTime
          ? (tick.simulatedTime.getTime() - currentContext.lastMealTime.getTime()) / 60000
          : Number.POSITIVE_INFINITY;
        const minutesSinceLastHotel = currentContext.lastHotelTime
          ? (tick.simulatedTime.getTime() - currentContext.lastHotelTime.getTime()) / 60000
          : Number.POSITIVE_INFINITY;
        const mealCooldownMet =
          !lastStopTime || minutesSinceLastStop >= MEAL_RETRIGGER_COOLDOWN_MINUTES;
        const shouldAskForMeal = Boolean(
          currentMealSlot &&
          mealCooldownMet &&
          minutesSinceLastMeal >= MIN_MEAL_SPACING_MINUTES &&
          tick.elapsedMinutes >= MIN_DRIVING_BEFORE_MEAL_MINUTES &&
          currentContext.lastStopCategory !== "restaurant" &&
          !(currentContext.lastMealSlot === currentMealSlot && minutesSinceLastMeal < 18 * 60),
        );
        const shouldAskForHotel =
          hour >= EVENING_LODGING_HOUR &&
          !hotelRecommendedThisNight &&
          minutesSinceLastHotel >= HOTEL_RETRIGGER_COOLDOWN_MINUTES &&
          tick.elapsedMinutes >= MIN_DRIVING_BEFORE_HOTEL_MINUTES &&
          currentContext.estimatedMilesRemaining >= HOTEL_MIN_REMAINING_DISTANCE_MILES &&
          currentContext.lastStopCategory !== "hotel";

        const hasTrigger =
          tick.fuelRemaining <= fuelThreshold ||
          minutesSinceLastStop >= preferences.restFrequencyMinutes ||
          shouldAskForMeal ||
          shouldAskForHotel;

        if (hasTrigger) {
          lastTriggeredFetchMiles = tick.distanceTraveledMiles;
          isFetchingRef = true; // Freezes sim on next tick

          const fuelRange = calculateRemainingRange({
            ...vehicle,
            currentFuelLevel: tick.fuelRemaining,
          });

          fetchPlacesAndWeather(tick.position.lat, tick.position.lng)
            .then(({ stops, weather }) => {
              const recs = getRecommendations({
                currentPosition: tick.position,
                fuelRangeMiles: fuelRange,
                tripContext: {
                  ...useTripStore.getState().context,
                  currentPosition: tick.position,
                  estimatedFuelRemaining: tick.fuelRemaining,
                },
                preferences,
                routeData: route,
                weather,
                currentTime: tick.simulatedTime,
                safetyBufferPercent: vehicle.safetyBufferPercent,
                stops,
              });

              if (recs.length > 0) {
                if (recs.some((r) => r.category === "hotel")) {
                  hotelRecommendedThisNight = true;
                }
                addRecommendations(recs);
              }
            })
            .finally(() => {
              isFetchingRef = false;
            });
        }
      }
    }, SIMULATION_TICK_MS);

    setSimulationInterval(intervalId);
  }, [route, vehicle, preferences, setSimulation, setSimulationInterval, updateContext, addRecommendations]);

  // Auto-resume: the store sets simShouldResume when all recs in the batch are resolved
  useEffect(() => {
    if (simShouldResume) {
      clearSimShouldResume();
      startSim(true);
    }
  }, [simShouldResume, clearSimShouldResume, startSim]);

  const toggleSim = useCallback(() => {
    if (simulation?.isRunning) {
      stopSimulation();
    } else {
      // Clear rec-pause state when manually playing
      if (useTripStore.getState().simPausedForRecs) {
        useTripStore.setState({ simPausedForRecs: false, simShouldResume: false });
      }
      startSim(!!simRef);
    }
  }, [simulation, stopSimulation, startSim]);

  const resetSim = useCallback(() => {
    stopSimulation();
    clearRecommendations();
    setSimulation(null);
    simRef = null;
    lastTriggeredFetchMiles = 0;
    hotelRecommendedThisNight = false;
    useTripStore.setState({ simPausedForRecs: false, simShouldResume: false });
    updateContext({
      elapsedDrivingMinutes: 0,
      estimatedFuelRemaining: vehicle.currentFuelLevel,
      distanceTraveledMiles: 0,
      estimatedMilesRemaining: route?.totalDistanceMiles ?? 0,
      currentPosition: null,
      currentSegmentIndex: 0,
      minutesSinceLastStop: 0,
      lastStopTime: null,
      lastStopCategory: null,
      lastMealTime: null,
      lastMealSlot: null,
      lastHotelTime: null,
    });
  }, [stopSimulation, clearRecommendations, setSimulation, updateContext, vehicle, route]);

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

      <div className="w-full bg-stone-200 rounded-full h-1.5 mb-2">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {simPausedForRecs && (
        <p className="text-xs text-amber-600 mb-2">
          Paused — review recommendations to continue
        </p>
      )}

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
