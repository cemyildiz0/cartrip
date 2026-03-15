import type {
  Stop,
  StopCategory,
  ScoredStop,
  ScoreBreakdown,
  CategoryWeights,
  UserPreferences,
  WeatherData,
  BudgetLevel,
  LatLng,
} from "@/types";
import { haversineDistance } from "../utils";
import { MEAL_TIMES, RECOMMENDATIONS_PER_CATEGORY } from "../constants";
import { computePreferenceScores } from "./tfidf";
import {
  filterByRouteCorridor,
  computeRouteScore,
  type RouteAnnotatedStop,
} from "./routeFilter";

export const CATEGORY_WEIGHTS: Record<StopCategory, CategoryWeights> = {
  fuel: {
    distance: 0.25,
    routeProximity: 0.25,
    preferenceMatch: 0.05,
    rating: 0.10,
    priceAlignment: 0.15,
    timeRelevance: 0.05,
    brandPreference: 0.15,
    weatherSuitability: 0.00,
  },
  restaurant: {
    distance: 0.10,
    routeProximity: 0.15,
    preferenceMatch: 0.30,
    rating: 0.20,
    priceAlignment: 0.10,
    timeRelevance: 0.10,
    brandPreference: 0.00,
    weatherSuitability: 0.05,
  },
  hotel: {
    distance: 0.10,
    routeProximity: 0.15,
    preferenceMatch: 0.20,
    rating: 0.25,
    priceAlignment: 0.15,
    timeRelevance: 0.05,
    brandPreference: 0.00,
    weatherSuitability: 0.10,
  },
  rest: {
    distance: 0.20,
    routeProximity: 0.30,
    preferenceMatch: 0.05,
    rating: 0.10,
    priceAlignment: 0.00,
    timeRelevance: 0.10,
    brandPreference: 0.00,
    weatherSuitability: 0.25,
  },
};

function computeDistanceScore(distanceMiles: number, maxDistanceMiles: number): number {
  if (maxDistanceMiles <= 0) return 0;
  return Math.max(0, 1 - distanceMiles / maxDistanceMiles);
}

function computeRatingScore(rating: number | null): number {
  if (rating === null) return 0.5;
  return Math.max(0, Math.min(1, rating / 5.0));
}

function computePriceAlignmentScore(
  priceLevel: number | null,
  budgetLevel: BudgetLevel,
): number {
  if (priceLevel === null) return 0.5;

  const targetMap: Record<BudgetLevel, number> = {
    budget: 0.5,
    moderate: 1.5,
    premium: 3.0,
  };
  const target = targetMap[budgetLevel];
  const diff = Math.abs(target - priceLevel);
  return Math.max(0, 1 - diff / 3);
}

function computeTimeRelevanceScore(stop: Stop, currentTime: Date): number {
  let score = 0.6;

  if (stop.openNow === true) score = 1.0;
  else if (stop.openNow === false) return 0.1;

  if (stop.category === "restaurant") {
    const hour = currentTime.getHours();
    for (const meal of Object.values(MEAL_TIMES)) {
      if (hour >= meal.start && hour <= meal.end) {
        score = Math.min(1, score + 0.1);
        break;
      }
    }
  }

  return score;
}

function computeBrandPreferenceScore(
  stop: Stop,
  preferredBrands: string[],
): number {
  if (preferredBrands.length === 0) return 0.5;
  if (stop.attributes.category !== "fuel") return 0.5;

  const brand = stop.attributes.brand.toLowerCase();
  const name = stop.name.toLowerCase();
  for (const preferred of preferredBrands) {
    const pref = preferred.toLowerCase();
    if (brand.includes(pref) || name.includes(pref)) {
      return 1.0;
    }
  }
  return 0.3;
}

const BAD_WEATHER_CONDITIONS = new Set([
  "thunderstorm",
  "snow",
  "rain",
  "drizzle",
  "sleet",
  "hail",
  "tornado",
  "squall",
]);

function computeWeatherScore(
  stop: Stop,
  weather: WeatherData | null,
): number {
  if (!weather) return 0.7;

  const condition = weather.condition.toLowerCase();
  const isBadWeather = BAD_WEATHER_CONDITIONS.has(condition) ||
    weather.alerts.some((a) => a.severity === "severe" || a.severity === "extreme");

  if (!isBadWeather) return 0.8;

  if (stop.category === "hotel" || stop.category === "restaurant") return 1.0;
  if (stop.category === "fuel") return 0.6;
  return 0.3;
}

function generateMatchReasons(
  stop: Stop,
  breakdown: ScoreBreakdown,
  weights: CategoryWeights,
): string[] {
  const reasons: string[] = [];
  const THRESHOLD = 0.06;

  if (breakdown.brandPreference >= 0.8 && weights.brandPreference * breakdown.brandPreference > THRESHOLD) {
    if (stop.attributes.category === "fuel") {
      reasons.push(`Matches your preferred brand (${stop.attributes.brand})`);
    }
  }

  if (breakdown.preferenceMatch >= 0.5 && weights.preferenceMatch * breakdown.preferenceMatch > THRESHOLD) {
    if (stop.category === "restaurant") {
      reasons.push("Matches your cuisine preferences");
    } else if (stop.category === "hotel") {
      reasons.push("Matches your lodging preferences");
    }
  }

  if (breakdown.rating >= 0.8 && stop.rating !== null) {
    reasons.push(`Highly rated (${stop.rating.toFixed(1)} stars)`);
  }

  if (breakdown.routeProximity >= 0.7 && weights.routeProximity > 0) {
    reasons.push("Right along your route");
  }

  if (breakdown.priceAlignment >= 0.8 && weights.priceAlignment * breakdown.priceAlignment > THRESHOLD) {
    reasons.push("Fits your budget");
  }

  if (breakdown.distance >= 0.8) {
    reasons.push("Very close by");
  }

  if (breakdown.weatherSuitability >= 0.9 && weights.weatherSuitability > 0.05) {
    reasons.push("Good shelter from weather");
  }

  if (reasons.length === 0) {
    reasons.push("Nearby option");
  }

  return reasons;
}

export interface ScoringInput {
  stops: Stop[];
  category: StopCategory;
  preferences: UserPreferences;
  currentPosition: LatLng;
  routePoints: LatLng[] | null;
  currentSegmentIndex: number;
  maxDistanceMiles: number;
  currentTime: Date;
  weather: WeatherData | null;
}

export function scoreAndRankStops(input: ScoringInput): ScoredStop[] {
  const {
    stops,
    category,
    preferences,
    currentPosition,
    routePoints,
    currentSegmentIndex,
    maxDistanceMiles,
    currentTime,
    weather,
  } = input;

  if (stops.length === 0) return [];

  const weights = CATEGORY_WEIGHTS[category];
  const corridorWidth = maxDistanceMiles;

  let routeAnnotations: Map<string, RouteAnnotatedStop> | null = null;
  if (routePoints && routePoints.length >= 2) {
    const annotated = filterByRouteCorridor(stops, routePoints, corridorWidth);
    routeAnnotations = new Map(annotated.map((s) => [s.id, s]));
  }

  const preferenceScores = computePreferenceScores(stops, preferences, category);

  const scored: ScoredStop[] = stops.map((stop) => {
    const distToUser = haversineDistance(currentPosition, stop.location.latLng);
    const routeInfo = routeAnnotations?.get(stop.id);
    const totalSegments = routePoints ? routePoints.length - 1 : 0;

    const breakdown: ScoreBreakdown = {
      distance: computeDistanceScore(distToUser, maxDistanceMiles),
      routeProximity: routeInfo
        ? computeRouteScore(
            routeInfo.routeDistanceMiles,
            corridorWidth,
            routeInfo.nearestSegmentIndex,
            currentSegmentIndex,
            totalSegments,
          )
        : 0.5,
      preferenceMatch: preferenceScores.get(stop.id) ?? 0,
      rating: computeRatingScore(stop.rating),
      priceAlignment: computePriceAlignmentScore(
        stop.priceLevel,
        category === "fuel"
          ? preferences.fuelBudgetLevel
          : category === "restaurant"
            ? preferences.dining.budgetLevel
            : preferences.lodging.budgetLevel,
      ),
      timeRelevance: computeTimeRelevanceScore(stop, currentTime),
      brandPreference: computeBrandPreferenceScore(stop, preferences.preferredBrands),
      weatherSuitability: computeWeatherScore(stop, weather),
    };

    const score =
      weights.distance * breakdown.distance +
      weights.routeProximity * breakdown.routeProximity +
      weights.preferenceMatch * breakdown.preferenceMatch +
      weights.rating * breakdown.rating +
      weights.priceAlignment * breakdown.priceAlignment +
      weights.timeRelevance * breakdown.timeRelevance +
      weights.brandPreference * breakdown.brandPreference +
      weights.weatherSuitability * breakdown.weatherSuitability;

    const matchReasons = generateMatchReasons(stop, breakdown, weights);

    return {
      ...stop,
      score,
      scoreBreakdown: breakdown,
      matchReasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, RECOMMENDATIONS_PER_CATEGORY);
}
