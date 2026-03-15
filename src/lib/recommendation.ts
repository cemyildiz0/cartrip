import type {
  LatLng,
  Stop,
  Recommendation,
  RecommendationTrigger,
  StopCategory,
  TripContext,
  UserPreferences,
  RouteData,
  WeatherData,
} from "@/types";
import { generateId, decodePolyline, haversineDistance } from "./utils";
import {
  RECOMMENDATIONS_PER_CATEGORY,
  EVENING_LODGING_HOUR,
  FUEL_WARNING_THRESHOLD,
  MEAL_TIMES,
  MEAL_RETRIGGER_COOLDOWN_MINUTES,
} from "./constants";
import { scoreAndRankStops } from "./scoring";

export interface RecommendationInput {
  currentPosition: LatLng;
  fuelRangeMiles: number;
  tripContext: TripContext;
  preferences: UserPreferences;
  routeData: RouteData | null;
  weather: WeatherData | null;
  currentTime?: Date;
  stops: {
    gasStations: Stop[];
    restaurants: Stop[];
    restStops: Stop[];
    hotels: Stop[];
  };
}

interface DetectedTrigger {
  trigger: RecommendationTrigger;
  category: StopCategory;
  reason: string;
}

function detectTriggers(
  tripContext: TripContext,
  preferences: UserPreferences,
  weather: WeatherData | null,
  currentTime: Date,
): DetectedTrigger[] {
  const triggers: DetectedTrigger[] = [];
  const hour = currentTime.getHours();

  if (tripContext.estimatedFuelRemaining <= FUEL_WARNING_THRESHOLD) {
    triggers.push({
      trigger: "low_fuel",
      category: "fuel",
      reason: `Fuel level is low (~${Math.round(tripContext.estimatedFuelRemaining * 100)}% remaining)`,
    });
  }

  if (tripContext.elapsedDrivingMinutes >= preferences.restFrequencyMinutes) {
    triggers.push({
      trigger: "driving_duration",
      category: "rest",
      reason: `You've been driving for ${Math.round(tripContext.elapsedDrivingMinutes)} minutes`,
    });
  }

  const cooldownMet = tripContext.minutesSinceLastStop >= MEAL_RETRIGGER_COOLDOWN_MINUTES;
  if (cooldownMet) {
    for (const [mealName, window] of Object.entries(MEAL_TIMES)) {
      if (hour >= window.start && hour <= window.end) {
        triggers.push({
          trigger: "meal_time",
          category: "restaurant",
          reason: `It's ${mealName} time — here are some nearby options`,
        });
        break;
      }
    }
  }

  const isNight = hour >= EVENING_LODGING_HOUR || tripContext.timeOfDay === "night";
  if (isNight) {
    triggers.push({
      trigger: "evening_lodging",
      category: "hotel",
      reason: "It's getting late — consider stopping for the night",
    });
  }

  if (weather) {
    const hasAlerts = weather.alerts.some(
      (a) => a.severity === "severe" || a.severity === "extreme" || a.severity === "moderate",
    );
    const badCondition = ["thunderstorm", "snow", "tornado", "squall"].includes(
      weather.condition.toLowerCase(),
    );
    if (hasAlerts || badCondition) {
      triggers.push({
        trigger: "weather_alert",
        category: "rest",
        reason: `Weather alert: ${weather.condition} — consider taking a break`,
      });
    }
  }

  return triggers;
}

let cachedPolyline: string | null = null;
let cachedRoutePoints: LatLng[] | null = null;

function getRoutePoints(routeData: RouteData | null): LatLng[] | null {
  if (!routeData) return null;
  if (cachedPolyline === routeData.polyline && cachedRoutePoints) {
    return cachedRoutePoints;
  }
  cachedPolyline = routeData.polyline;
  cachedRoutePoints = decodePolyline(routeData.polyline);
  return cachedRoutePoints;
}

function getStopsForCategory(
  category: StopCategory,
  stops: RecommendationInput["stops"],
): Stop[] {
  switch (category) {
    case "fuel":
      return stops.gasStations;
    case "restaurant":
      return stops.restaurants;
    case "rest":
      return stops.restStops;
    case "hotel":
      return stops.hotels;
  }
}

function filterByFuelRange(
  currentPosition: LatLng,
  stops: Stop[],
  fuelRangeMiles: number,
): Stop[] {
  return stops.filter(
    (s) => haversineDistance(currentPosition, s.location.latLng) <= fuelRangeMiles,
  );
}

export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const {
    currentPosition,
    fuelRangeMiles,
    tripContext,
    preferences,
    routeData,
    weather,
    stops,
  } = input;

  const routePoints = getRoutePoints(routeData);
  const now = input.currentTime ?? new Date();

  const triggers = detectTriggers(tripContext, preferences, weather, now);

  if (triggers.length === 0 && stops.gasStations.length > 0) {
    triggers.push({
      trigger: "user_request",
      category: "fuel",
      reason: "Nearby gas stations",
    });
  }

  const recommendations: Recommendation[] = [];

  const seen = new Set<StopCategory>();

  for (const { trigger, category, reason } of triggers) {
    if (seen.has(category)) continue;
    seen.add(category);

    const categoryStops = getStopsForCategory(category, stops);
    if (categoryStops.length === 0) continue;

    const reachable = filterByFuelRange(currentPosition, categoryStops, fuelRangeMiles);
    if (reachable.length === 0) continue;

    const scoredStops = scoreAndRankStops({
      stops: reachable,
      category,
      preferences,
      currentPosition,
      routePoints,
      currentSegmentIndex: tripContext.currentSegmentIndex,
      maxDistanceMiles: fuelRangeMiles,
      currentTime: now,
      weather,
    });

    if (scoredStops.length === 0) continue;

    recommendations.push({
      id: generateId(),
      category,
      trigger,
      triggerReason: reason,
      stops: scoredStops,
      scoredStops,
      timestamp: now,
      dismissed: false,
      acceptedStopId: null,
    });
  }

  return recommendations;
}

export function recommendGas(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  gasStations: Stop[],
): Stop[] {
  const reachable = filterByFuelRange(currentPosition, gasStations, fuelRangeMiles);
  return reachable
    .map((s) => ({
      ...s,
      _dist: haversineDistance(currentPosition, s.location.latLng),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, RECOMMENDATIONS_PER_CATEGORY);
}

export function recommendRest(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  elapsedDrivingMinutes: number,
  restFrequencyMinutes: number,
  restStops: Stop[],
): Stop[] {
  if (elapsedDrivingMinutes < restFrequencyMinutes) return [];
  const reachable = filterByFuelRange(currentPosition, restStops, fuelRangeMiles);
  return reachable
    .map((s) => ({
      ...s,
      _dist: haversineDistance(currentPosition, s.location.latLng),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, RECOMMENDATIONS_PER_CATEGORY);
}

export function recommendHotel(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  isNight: boolean,
  hotels: Stop[],
): Stop[] {
  if (!isNight) return [];
  const reachable = filterByFuelRange(currentPosition, hotels, fuelRangeMiles);
  return reachable
    .map((s) => ({
      ...s,
      _dist: haversineDistance(currentPosition, s.location.latLng),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, RECOMMENDATIONS_PER_CATEGORY);
}
