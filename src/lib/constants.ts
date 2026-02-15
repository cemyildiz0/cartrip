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

export const DEFAULT_VEHICLE: VehicleProfile = {
  name: "",
  fuelType: "gasoline",
  tankCapacityGallons: 14,
  fuelEfficiencyMpg: 30,
  currentFuelLevel: 1.0,
  safetyBufferPercent: 0.2,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  maxDrivingDurationMinutes: 180,
  restFrequencyMinutes: 120,
  fuelBudgetLevel: "moderate",
  dining: {
    cuisineTypes: [],
    dietaryRestrictions: [],
    budgetLevel: "moderate",
  },
  lodging: {
    minStarRating: 3,
    amenities: [],
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

export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Kosher",
  "Dairy-Free",
  "Nut-Free",
] as const;

export const HOTEL_AMENITY_OPTIONS = [
  "WiFi",
  "Pool",
  "Breakfast Included",
  "Parking",
  "Pet-Friendly",
  "Gym",
  "Restaurant",
  "Room Service",
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
