import type {
  LatLng,
  VehicleProfile,
  UserPreferences,
  RouteData,
  SimulationTick,
  RecommendationTrigger,
} from "@/types";
import { haversineDistance, decodePolyline } from "./utils";
import {
  FUEL_WARNING_THRESHOLD,
  MEAL_TIMES,
  EVENING_LODGING_HOUR,
  SIMULATION_TICK_MS,
  SIMULATION_AVG_SPEED_MPH,
  PLACE_FETCH_THRESHOLD_MILES,
} from "./constants";

export interface SimulationConfig {
  route: RouteData;
  vehicle: VehicleProfile;
  preferences: UserPreferences;
  speedRef: { current: number };
  startTime: Date;
  resumeState?: {
    positionIndex: number;
    distanceTraveledMiles: number;
    elapsedMinutes: number;
    fuelRemaining: number;
  };
}

export interface Simulation {
  tick: () => SimulationTick;
  isComplete: () => boolean;
  getRoutePoints: () => LatLng[];
  getState: () => {
    positionIndex: number;
    distanceTraveledMiles: number;
    elapsedMinutes: number;
    fuelRemaining: number;
  };
  refuel: (level: number) => void;
}

export function createSimulation(config: SimulationConfig): Simulation {
  const routePoints = decodePolyline(config.route.polyline);
  const totalPoints = routePoints.length;

  let positionIndex = config.resumeState?.positionIndex ?? 0;
  let distanceTraveledMiles = config.resumeState?.distanceTraveledMiles ?? 0;
  let elapsedMinutes = config.resumeState?.elapsedMinutes ?? 0;
  let fuelRemaining = config.resumeState?.fuelRemaining ?? config.vehicle.currentFuelLevel;
  let lastFetchDistance = distanceTraveledMiles;
  let simulatedTime = new Date(config.startTime.getTime() + elapsedMinutes * 60 * 1000);

  const fuelConsumptionPerMile = 1 / config.vehicle.fuelEfficiencyMpg / config.vehicle.tankCapacityGallons;

  function tick(): SimulationTick {
    const realSecondsPerTick = SIMULATION_TICK_MS / 1000;
    const simMinutesPerTick = (realSecondsPerTick * config.speedRef.current * 60) / 60;
    const simMilesPerTick = (SIMULATION_AVG_SPEED_MPH / 60) * simMinutesPerTick;

    let milesThisTick = 0;
    while (milesThisTick < simMilesPerTick && positionIndex < totalPoints - 1) {
      const segDist = haversineDistance(routePoints[positionIndex], routePoints[positionIndex + 1]);
      milesThisTick += segDist;
      positionIndex++;
    }

    distanceTraveledMiles += milesThisTick;
    // Use actual distance for elapsed time (not fixed simMinutesPerTick)
    // to avoid undercounting when polyline segments overshoot the target
    elapsedMinutes += (milesThisTick / SIMULATION_AVG_SPEED_MPH) * 60;
    fuelRemaining = Math.max(0, fuelRemaining - milesThisTick * fuelConsumptionPerMile);
    simulatedTime = new Date(config.startTime.getTime() + elapsedMinutes * 60 * 1000);

    const shouldFetchPlaces = distanceTraveledMiles - lastFetchDistance >= PLACE_FETCH_THRESHOLD_MILES;
    if (shouldFetchPlaces) lastFetchDistance = distanceTraveledMiles;

    const triggers = detectSimTriggers(
      fuelRemaining,
      elapsedMinutes,
      config.preferences.restFrequencyMinutes,
      simulatedTime,
    );

    return {
      position: routePoints[Math.min(positionIndex, totalPoints - 1)],
      segmentIndex: positionIndex,
      elapsedMinutes,
      fuelRemaining,
      distanceTraveledMiles,
      simulatedTime,
      shouldFetchPlaces,
      triggers,
    };
  }

  function isComplete(): boolean {
    return positionIndex >= totalPoints - 1;
  }

  function getRoutePoints(): LatLng[] {
    return routePoints;
  }

  function getState() {
    return { positionIndex, distanceTraveledMiles, elapsedMinutes, fuelRemaining };
  }

  function refuel(level: number) {
    fuelRemaining = level;
  }

  return { tick, isComplete, getRoutePoints, getState, refuel };
}

function detectSimTriggers(
  fuelRemaining: number,
  elapsedMinutes: number,
  restFrequency: number,
  simTime: Date,
): RecommendationTrigger[] {
  const triggers: RecommendationTrigger[] = [];
  const hour = simTime.getHours();

  if (fuelRemaining <= FUEL_WARNING_THRESHOLD) {
    triggers.push("low_fuel");
  }

  if (elapsedMinutes >= restFrequency) {
    triggers.push("driving_duration");
  }

  for (const window of Object.values(MEAL_TIMES)) {
    if (hour >= window.start && hour <= window.end) {
      triggers.push("meal_time");
      break;
    }
  }

  if (hour >= EVENING_LODGING_HOUR) {
    triggers.push("evening_lodging");
  }

  return triggers;
}
