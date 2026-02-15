import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BudgetLevel,
  DiningPreferences,
  FuelType,
  LodgingPreferences,
  UserPreferences,
  VehicleProfile,
} from "@/types";
import { DEFAULT_PREFERENCES, DEFAULT_VEHICLE } from "@/lib/constants";

interface UserState {
  vehicle: VehicleProfile;
  preferences: UserPreferences;
  hasCompletedSetup: boolean;
}

interface UserActions {
  setVehicle: (vehicle: Partial<VehicleProfile>) => void;
  setFuelType: (fuelType: FuelType) => void;
  setTankCapacity: (gallons: number) => void;
  setFuelEfficiency: (mpg: number) => void;
  setCurrentFuelLevel: (level: number) => void;
  setSafetyBuffer: (percent: number) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setMaxDrivingDuration: (minutes: number) => void;
  setRestFrequency: (minutes: number) => void;
  setFuelBudget: (level: BudgetLevel) => void;
  setDiningPreferences: (dining: Partial<DiningPreferences>) => void;
  setLodgingPreferences: (lodging: Partial<LodgingPreferences>) => void;
  setPreferredBrands: (brands: string[]) => void;
  setAvoidHighways: (avoid: boolean) => void;
  completeSetup: () => void;
  resetProfile: () => void;
}

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set) => ({
      vehicle: { ...DEFAULT_VEHICLE },
      preferences: { ...DEFAULT_PREFERENCES },
      hasCompletedSetup: false,

      setVehicle: (partial) =>
        set((state) => ({
          vehicle: { ...state.vehicle, ...partial },
        })),

      setFuelType: (fuelType) =>
        set((state) => ({ vehicle: { ...state.vehicle, fuelType } })),

      setTankCapacity: (gallons) =>
        set((state) => ({
          vehicle: { ...state.vehicle, tankCapacityGallons: gallons },
        })),

      setFuelEfficiency: (mpg) =>
        set((state) => ({
          vehicle: { ...state.vehicle, fuelEfficiencyMpg: mpg },
        })),

      setCurrentFuelLevel: (level) =>
        set((state) => ({
          vehicle: { ...state.vehicle, currentFuelLevel: level },
        })),

      setSafetyBuffer: (percent) =>
        set((state) => ({
          vehicle: { ...state.vehicle, safetyBufferPercent: percent },
        })),

      setPreferences: (partial) =>
        set((state) => ({
          preferences: { ...state.preferences, ...partial },
        })),

      setMaxDrivingDuration: (minutes) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            maxDrivingDurationMinutes: minutes,
          },
        })),

      setRestFrequency: (minutes) =>
        set((state) => ({
          preferences: { ...state.preferences, restFrequencyMinutes: minutes },
        })),

      setFuelBudget: (level) =>
        set((state) => ({
          preferences: { ...state.preferences, fuelBudgetLevel: level },
        })),

      setDiningPreferences: (dining) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            dining: { ...state.preferences.dining, ...dining },
          },
        })),

      setLodgingPreferences: (lodging) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            lodging: { ...state.preferences.lodging, ...lodging },
          },
        })),

      setPreferredBrands: (brands) =>
        set((state) => ({
          preferences: { ...state.preferences, preferredBrands: brands },
        })),

      setAvoidHighways: (avoid) =>
        set((state) => ({
          preferences: { ...state.preferences, avoidHighways: avoid },
        })),

      completeSetup: () => set({ hasCompletedSetup: true }),

      resetProfile: () =>
        set({
          vehicle: { ...DEFAULT_VEHICLE },
          preferences: { ...DEFAULT_PREFERENCES },
          hasCompletedSetup: false,
        }),
    }),
    {
      name: "cartrip-user-preferences",
    },
  ),
);
