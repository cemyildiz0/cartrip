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
  MIN_MEAL_SPACING_MINUTES,
  MIN_DRIVING_BEFORE_MEAL_MINUTES,
  MIN_DRIVING_BEFORE_HOTEL_MINUTES,
  HOTEL_MIN_REMAINING_DISTANCE_MILES,
  HOTEL_RETRIGGER_COOLDOWN_MINUTES,
  CATEGORY_MAX_DETOUR_MILES,
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
  safetyBufferPercent?: number;
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

function getMealSlotForHour(hour: number): "breakfast" | "lunch" | "dinner" | null {
  for (const [mealName, window] of Object.entries(MEAL_TIMES)) {
    if (hour >= window.start && hour <= window.end) {
      return mealName as "breakfast" | "lunch" | "dinner";
    }
  }
  return null;
}

function detectTriggers(
  tripContext: TripContext,
  preferences: UserPreferences,
  weather: WeatherData | null,
  currentTime: Date,
  safetyBufferPercent = 0.2,
): DetectedTrigger[] {
  const triggers: DetectedTrigger[] = [];
  const hour = currentTime.getHours();

  // Trigger when fuel drops to safety buffer + 10% margin to allow time for the async fetch
  const fuelThreshold = Math.max(FUEL_WARNING_THRESHOLD, safetyBufferPercent + 0.10);
  if (tripContext.estimatedFuelRemaining <= fuelThreshold) {
    triggers.push({
      trigger: "low_fuel",
      category: "fuel",
      reason: `Fuel level is low (~${Math.round(tripContext.estimatedFuelRemaining * 100)}% remaining)`,
    });
  }

  if (tripContext.minutesSinceLastStop >= preferences.restFrequencyMinutes) {
    triggers.push({
      trigger: "driving_duration",
      category: "rest",
      reason: `You've been driving for ${Math.round(tripContext.minutesSinceLastStop)} minutes without a break`,
    });
  }

  // Only apply meal cooldown after a stop has been taken (prevents re-triggering).
  // Before any stops, always allow meal recs when in a meal window.
  const currentMealSlot = getMealSlotForHour(hour);
  const minutesSinceLastMeal = tripContext.lastMealTime
    ? (currentTime.getTime() - tripContext.lastMealTime.getTime()) / 60000
    : Number.POSITIVE_INFINITY;
  const mealCooldownMet = !tripContext.lastStopTime ||
    tripContext.minutesSinceLastStop >= MEAL_RETRIGGER_COOLDOWN_MINUTES;
  const mealSpacingMet = minutesSinceLastMeal >= MIN_MEAL_SPACING_MINUTES;
  const enoughDrivingForMeal = tripContext.elapsedDrivingMinutes >= MIN_DRIVING_BEFORE_MEAL_MINUTES;
  const sameMealAlreadyTaken = tripContext.lastMealSlot === currentMealSlot && minutesSinceLastMeal < 18 * 60;

  if (
    currentMealSlot &&
    mealCooldownMet &&
    mealSpacingMet &&
    enoughDrivingForMeal &&
    !sameMealAlreadyTaken &&
    tripContext.lastStopCategory !== "restaurant"
  ) {
    triggers.push({
      trigger: "meal_time",
      category: "restaurant",
      reason: `It's ${currentMealSlot} time — here are some nearby options`,
    });
  }

  const isNight = hour >= EVENING_LODGING_HOUR || tripContext.timeOfDay === "night";
  const minutesSinceLastHotel = tripContext.lastHotelTime
    ? (currentTime.getTime() - tripContext.lastHotelTime.getTime()) / 60000
    : Number.POSITIVE_INFINITY;
  const hotelCooldownMet = minutesSinceLastHotel >= HOTEL_RETRIGGER_COOLDOWN_MINUTES;
  const enoughDrivingForHotel = tripContext.elapsedDrivingMinutes >= MIN_DRIVING_BEFORE_HOTEL_MINUTES;
  const hotelStillMakesSense = tripContext.estimatedMilesRemaining >= HOTEL_MIN_REMAINING_DISTANCE_MILES;

  if (
    isNight &&
    hotelCooldownMet &&
    enoughDrivingForHotel &&
    hotelStillMakesSense &&
    tripContext.lastStopCategory !== "hotel"
  ) {
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

function computeDetourDistances(
  currentPosition: LatLng,
  stops: Stop[],
): Stop[] {
  return stops.map((s) => ({
    ...s,
    detourDistanceMiles: haversineDistance(currentPosition, s.location.latLng),
    detourDurationMinutes: (haversineDistance(currentPosition, s.location.latLng) / 40) * 60,
  }));
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

function filterStopsForRealism(category: StopCategory, stops: Stop[]): Stop[] {
  const maxDetour = CATEGORY_MAX_DETOUR_MILES[category];

  return stops.filter((stop) => {
    if (stop.openNow === false) return false;
    if (stop.detourDistanceMiles > maxDetour) return false;

    if (category === "restaurant") {
      const waitMinutes = stop.attributes.category === "restaurant"
        ? stop.attributes.estimatedWaitMinutes
        : null;
      if (waitMinutes !== null && waitMinutes > 45) return false;
    }

    return true;
  });
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

  const triggers = detectTriggers(tripContext, preferences, weather, now, input.safetyBufferPercent);

  if (triggers.length === 0) return [];

  const recommendations: Recommendation[] = [];

  const seen = new Set<StopCategory>();

  for (const { trigger, category: triggerCategory, reason } of triggers) {
    let category = triggerCategory;
    if (seen.has(category)) continue;

    let rawStops = getStopsForCategory(category, stops);

    // Rest stops are rarely indexed in Google Places — fall back to restaurants
    if (rawStops.length === 0 && category === "rest") {
      category = "restaurant";
      if (seen.has(category)) continue;
      rawStops = getStopsForCategory(category, stops);
    }

    seen.add(category);
    if (rawStops.length === 0) continue;

    const categoryStops = filterStopsForRealism(
      category,
      computeDetourDistances(currentPosition, rawStops),
    );
    if (categoryStops.length === 0) continue;

    // Only filter by fuel range for gas stations — other categories shouldn't be
    // gated by remaining fuel since the driver can still reach nearby places
    const candidates =
      category === "fuel"
        ? filterByFuelRange(currentPosition, categoryStops, Math.max(fuelRangeMiles, 10))
        : categoryStops;
    if (candidates.length === 0) continue;

    const maxDist = category === "fuel"
      ? Math.max(Math.min(fuelRangeMiles, CATEGORY_MAX_DETOUR_MILES.fuel), 3)
      : CATEGORY_MAX_DETOUR_MILES[category];

    const scoredStops = scoreAndRankStops({
      stops: candidates,
      category,
      preferences,
      currentPosition,
      routePoints,
      currentSegmentIndex: tripContext.currentSegmentIndex,
      maxDistanceMiles: maxDist,
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
