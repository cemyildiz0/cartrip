export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location {
  latLng: LatLng;
  address: string;
  placeId?: string;
}

export type FuelType = "gasoline" | "diesel" | "electric" | "hybrid";

export interface VehicleProfile {
  name: string;
  fuelType: FuelType;
  tankCapacityGallons: number;
  fuelEfficiencyMpg: number;
  currentFuelLevel: number;
  safetyBufferPercent: number;
}

export type BudgetLevel = "budget" | "moderate" | "premium";

export interface DiningPreferences {
  cuisineTypes: string[];
  dietaryRestrictions: string[];
  budgetLevel: BudgetLevel;
}

export interface LodgingPreferences {
  minStarRating: number;
  amenities: string[];
  budgetLevel: BudgetLevel;
}

export interface UserPreferences {
  maxDrivingDurationMinutes: number;
  restFrequencyMinutes: number;
  fuelBudgetLevel: BudgetLevel;
  dining: DiningPreferences;
  lodging: LodgingPreferences;
  preferredBrands: string[];
  avoidHighways: boolean;
}

export type TripStatus = "planning" | "active" | "paused" | "completed";

export interface TripConfig {
  origin: Location;
  destination: Location;
  waypoints: Location[];
  departureTime: Date;
  vehicleProfile: VehicleProfile;
  preferences: UserPreferences;
}

export interface RouteData {
  polyline: string;
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  legs: RouteLeg[];
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

export interface RouteLeg {
  startLocation: LatLng;
  endLocation: LatLng;
  distanceMiles: number;
  durationMinutes: number;
  steps: RouteStep[];
}

export interface RouteStep {
  startLocation: LatLng;
  endLocation: LatLng;
  distanceMiles: number;
  durationMinutes: number;
  instruction: string;
  polyline: string;
}

export type StopCategory = "fuel" | "restaurant" | "rest" | "hotel";

export interface Stop {
  id: string;
  placeId: string;
  category: StopCategory;
  name: string;
  location: Location;
  detourDistanceMiles: number;
  detourDurationMinutes: number;
  rating: number | null;
  priceLevel: number | null;
  photos: string[];
  openNow: boolean | null;
  attributes: StopAttributes;
}

export type StopAttributes =
  | FuelStopAttributes
  | RestaurantAttributes
  | RestAttributes
  | HotelAttributes;

export interface FuelStopAttributes {
  category: "fuel";
  brand: string;
  fuelPrice: number | null;
  amenities: string[];
}

export interface RestaurantAttributes {
  category: "restaurant";
  cuisineTypes: string[];
  priceRange: string;
  estimatedWaitMinutes: number | null;
}

export interface RestAttributes {
  category: "rest";
  hasRestrooms: boolean;
  hasPicnicArea: boolean;
  hasVendingMachines: boolean;
}

export interface HotelAttributes {
  category: "hotel";
  starRating: number;
  amenities: string[];
  pricePerNight: number | null;
  checkInTime: string | null;
}

export type RecommendationTrigger =
  | "low_fuel"
  | "meal_time"
  | "driving_duration"
  | "evening_lodging"
  | "weather_alert"
  | "traffic_delay"
  | "user_request";

export type MealSlot = "breakfast" | "lunch" | "dinner";

export interface Recommendation {
  id: string;
  category: StopCategory;
  trigger: RecommendationTrigger;
  triggerReason: string;
  stops: Stop[];
  scoredStops?: ScoredStop[];
  timestamp: Date;
  dismissed: boolean;
  acceptedStopId: string | null;
}

export interface TripContext {
  elapsedDrivingMinutes: number;
  estimatedFuelRemaining: number;
  estimatedMilesRemaining: number;
  distanceTraveledMiles: number;
  currentPosition: LatLng | null;
  currentSegmentIndex: number;
  timeOfDay: "morning" | "midday" | "afternoon" | "evening" | "night";
  lastStopTime: Date | null;
  minutesSinceLastStop: number;
  lastStopCategory: StopCategory | null;
  lastMealTime: Date | null;
  lastMealSlot: MealSlot | null;
  lastHotelTime: Date | null;
}

export interface WeatherData {
  location: LatLng;
  temperature: number;
  condition: string;
  icon: string;
  windSpeedMph: number;
  visibility: number;
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  event: string;
  description: string;
  severity: "minor" | "moderate" | "severe" | "extreme";
}

export interface DirectionsApiResponse {
  route: RouteData | null;
  error: string | null;
}

export interface PlacesApiResponse {
  stops: Stop[];
  error: string | null;
}

export interface WeatherApiResponse {
  weather: WeatherData | null;
  error: string | null;
}

export interface ScoredStop extends Stop {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  matchReasons: string[];
}

export interface ScoreBreakdown {
  distance: number;
  routeProximity: number;
  preferenceMatch: number;
  rating: number;
  priceAlignment: number;
  timeRelevance: number;
  brandPreference: number;
  weatherSuitability: number;
}

export interface CategoryWeights {
  distance: number;
  routeProximity: number;
  preferenceMatch: number;
  rating: number;
  priceAlignment: number;
  timeRelevance: number;
  brandPreference: number;
  weatherSuitability: number;
}

export interface TfIdfDocument {
  stopId: string;
  terms: string[];
  tfVector: Map<string, number>;
}

export interface TfIdfCorpus {
  documents: TfIdfDocument[];
  idfVector: Map<string, number>;
  vocabulary: Set<string>;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number;
  simulatedTime: Date;
  positionIndex: number;
  routePoints: LatLng[];
}

export interface SimulationTick {
  position: LatLng;
  segmentIndex: number;
  elapsedMinutes: number;
  fuelRemaining: number;
  distanceTraveledMiles: number;
  simulatedTime: Date;
  shouldFetchPlaces: boolean;
  triggers: RecommendationTrigger[];
}
