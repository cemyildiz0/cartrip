import type {
  BudgetLevel,
  StopCategory,
  UserPreferences,
  VehicleProfile,
} from "@/types";

export const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 };
export const DEFAULT_MAP_ZOOM = 6;
export const ROUTE_ACTIVE_COLOR = "#4f6d7a";
export const ROUTE_INACTIVE_COLOR = "#94a3b8";

export const STOP_CATEGORY_CONFIG: Record<
  StopCategory,
  { color: string; label: string; icon: string }
> = {
  fuel: { color: "#e85d4a", label: "Gas Station", icon: "Fuel" },
  restaurant: {
    color: "#e8943a",
    label: "Restaurant",
    icon: "UtensilsCrossed",
  },
  rest: { color: "#5aab61", label: "Rest Stop", icon: "TreePine" },
  hotel: { color: "#7c6bbf", label: "Hotel", icon: "Hotel" },
};

export const FUEL_WARNING_THRESHOLD = 0.25;
export const MAX_DRIVING_WITHOUT_BREAK_MINUTES = 120;
export const MEAL_TIMES = {
  breakfast: { start: 7, end: 9 },
  lunch: { start: 11, end: 13 },
  dinner: { start: 17, end: 19 },
};
export const EVENING_LODGING_HOUR = 20;
export const MAX_DETOUR_MILES = 5;
export const RECOMMENDATIONS_PER_CATEGORY = 3;
export const MIN_MEAL_SPACING_MINUTES = 180;
export const MIN_DRIVING_BEFORE_MEAL_MINUTES = 150;
export const MIN_DRIVING_BEFORE_HOTEL_MINUTES = 480;
export const HOTEL_MIN_REMAINING_DISTANCE_MILES = 120;
export const CATEGORY_MAX_DETOUR_MILES = {
  fuel: 6,
  restaurant: 3,
  rest: 4,
  hotel: 8,
} as const;

export const DEFAULT_VEHICLE: VehicleProfile = {
  name: "",
  tankCapacityGallons: 14,
  fuelEfficiencyMpg: 30,
  currentFuelLevel: 1.0,
  safetyBufferPercent: 0.2,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  restFrequencyMinutes: 120,
  fuelBudgetLevel: "moderate",
  dining: {
    cuisineTypes: [],
    budgetLevel: "moderate",
  },
  lodging: {
    budgetLevel: "moderate",
  },
  preferredBrands: [],
  avoidHighways: false,
};

export const BUDGET_LABELS: Record<BudgetLevel, string> = {
  budget: "Budget-Friendly",
  moderate: "Moderate",
  premium: "Premium",
};

export const CUISINE_OPTIONS = [
  "American",
  "Mexican",
  "Italian",
  "Chinese",
  "Japanese",
  "Indian",
  "Thai",
  "Mediterranean",
  "Fast Food",
  "BBQ",
  "Seafood",
  "Vegan",
  "Pizza",
  "Burgers",
  "Coffee & Cafe",
] as const;

export const GAS_STATION_BRANDS = [
  "Shell",
  "Chevron",
  "ExxonMobil",
  "BP",
  "Costco",
  "ARCO",
  "76",
  "Valero",
  "Speedway",
  "Circle K",
] as const;

export const ROUTE_CORRIDOR_WIDTH_MILES = 5;
export const WEATHER_CHECK_INTERVAL_MILES = 20;
export const SIMULATION_TICK_MS = 100;
export const PLACE_FETCH_THRESHOLD_MILES = 20;
export const SIMULATION_AVG_SPEED_MPH = 60;

export const MEAL_RETRIGGER_COOLDOWN_MINUTES = 60;
export const HOTEL_RETRIGGER_COOLDOWN_MINUTES = 480;
