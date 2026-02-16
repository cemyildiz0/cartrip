import type {
  LatLng,
  Stop,
  Recommendation,
  RecommendationTrigger,
  TripContext,
  UserPreferences,
} from "@/types";
import { haversineDistance, generateId, getTimeOfDay } from "./utils";
import {
  RECOMMENDATIONS_PER_CATEGORY,
  EVENING_LODGING_HOUR,
} from "./constants";

interface RecommendationInput {
  currentPosition: LatLng;
  fuelRangeMiles: number;
  tripContext: TripContext;
  preferences: UserPreferences;
  stops: {
    gasStations: Stop[];
    restStops: Stop[];
    hotels: Stop[];
  };
}

function filterByRange(
  currentPosition: LatLng,
  stops: Stop[],
  maxDistanceMiles: number,
): (Stop & { _distance: number })[] {
  return stops
    .map((stop) => ({
      ...stop,
      _distance: haversineDistance(currentPosition, stop.location.latLng),
    }))
    .filter((stop) => stop._distance <= maxDistanceMiles)
    .sort((a, b) => a._distance - b._distance);
}

export function recommendGas(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  gasStations: Stop[],
): Stop[] {
  return filterByRange(currentPosition, gasStations, fuelRangeMiles).slice(
    0,
    RECOMMENDATIONS_PER_CATEGORY,
  );
}

export function recommendRest(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  elapsedDrivingMinutes: number,
  restFrequencyMinutes: number,
  restStops: Stop[],
): Stop[] {
  if (elapsedDrivingMinutes < restFrequencyMinutes) {
    return [];
  }

  return filterByRange(currentPosition, restStops, fuelRangeMiles).slice(
    0,
    RECOMMENDATIONS_PER_CATEGORY,
  );
}

export function recommendHotel(
  currentPosition: LatLng,
  fuelRangeMiles: number,
  isNight: boolean,
  hotels: Stop[],
): Stop[] {
  if (!isNight) {
    return [];
  }

  return filterByRange(currentPosition, hotels, fuelRangeMiles).slice(
    0,
    RECOMMENDATIONS_PER_CATEGORY,
  );
}

export function getRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const {
    currentPosition,
    fuelRangeMiles,
    tripContext,
    preferences,
    stops,
  } = input;

  const recommendations: Recommendation[] = [];
  const now = new Date();
  const timeOfDay = getTimeOfDay(now);
  const isNight = now.getHours() >= EVENING_LODGING_HOUR || timeOfDay === "night";

  const gasStops = recommendGas(currentPosition, fuelRangeMiles, stops.gasStations);
  if (gasStops.length > 0) {
    const trigger: RecommendationTrigger =
      tripContext.estimatedFuelRemaining <= 0.25 ? "low_fuel" : "user_request";
    recommendations.push({
      id: generateId(),
      category: "fuel",
      trigger,
      triggerReason:
        trigger === "low_fuel"
          ? "Fuel level is getting low"
          : "Nearby gas stations",
      stops: gasStops,
      timestamp: now,
      dismissed: false,
      acceptedStopId: null,
    });
  }

  const restStops = recommendRest(
    currentPosition,
    fuelRangeMiles,
    tripContext.elapsedDrivingMinutes,
    preferences.restFrequencyMinutes,
    stops.restStops,
  );
  if (restStops.length > 0) {
    recommendations.push({
      id: generateId(),
      category: "rest",
      trigger: "driving_duration",
      triggerReason: `You've been driving for ${Math.round(tripContext.elapsedDrivingMinutes)} minutes`,
      stops: restStops,
      timestamp: now,
      dismissed: false,
      acceptedStopId: null,
    });
  }

  const hotelStops = recommendHotel(
    currentPosition,
    fuelRangeMiles,
    isNight,
    stops.hotels,
  );
  if (hotelStops.length > 0) {
    recommendations.push({
      id: generateId(),
      category: "hotel",
      trigger: "evening_lodging",
      triggerReason: "It's getting late — consider stopping for the night",
      stops: hotelStops,
      timestamp: now,
      dismissed: false,
      acceptedStopId: null,
    });
  }

  return recommendations;
}
