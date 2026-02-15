"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useUserStore } from "@/store/userStore";
import { useTripStore } from "@/store/tripStore";
import {
  BUDGET_LABELS,
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  GAS_STATION_BRANDS,
} from "@/lib/constants";
import type { BudgetLevel, FuelType } from "@/types";

export default function TripSetupPanel() {
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [showVehicle, setShowVehicle] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const vehicle = useUserStore((s) => s.vehicle);
  const preferences = useUserStore((s) => s.preferences);
  const setVehicle = useUserStore((s) => s.setVehicle);
  const setPreferences = useUserStore((s) => s.setPreferences);
  const setDiningPreferences = useUserStore((s) => s.setDiningPreferences);

  const isLoadingRoute = useTripStore((s) => s.isLoadingRoute);
  const routeError = useTripStore((s) => s.routeError);

  const handlePlanTrip = async () => {
    if (!originInput.trim() || !destinationInput.trim()) return;

    useTripStore.getState().setRouteLoading(true);

    try {
      const params = new URLSearchParams({
        origin: originInput,
        destination: destinationInput,
        avoidHighways: String(preferences.avoidHighways),
      });

      const res = await fetch(`/api/directions?${params}`);
      const data = await res.json();

      if (data.error) {
        useTripStore.getState().setRouteError(data.error);
        return;
      }

      useTripStore.getState().setRoute(data.route);
      useTripStore.getState().setOrigin({
        latLng: data.route.legs[0].startLocation,
        address: originInput,
      });
      useTripStore.getState().setDestination({
        latLng: data.route.legs[data.route.legs.length - 1].endLocation,
        address: destinationInput,
      });
    } catch {
      useTripStore.getState().setRouteError("Failed to plan route");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 md:pb-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Plan Your Trip</h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Enter your route and preferences to get started.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label="Starting Point"
          placeholder="Enter origin address..."
          value={originInput}
          onChange={(e) => setOriginInput(e.target.value)}
        />
        <Input
          label="Destination"
          placeholder="Enter destination address..."
          value={destinationInput}
          onChange={(e) => setDestinationInput(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-4 py-3.5 md:py-3 text-left hover:bg-stone-50 active:bg-stone-100 transition-colors"
          onClick={() => setShowVehicle(!showVehicle)}
        >
          <span className="text-sm font-medium text-stone-800">
            Vehicle Details
          </span>
          {showVehicle ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>
        {showVehicle && (
          <div className="border-t border-stone-100 p-4 flex flex-col gap-3">
            <Input
              label="Vehicle Name"
              placeholder="e.g. 2020 Toyota Camry"
              value={vehicle.name}
              onChange={(e) => setVehicle({ name: e.target.value })}
            />
            <Select
              label="Fuel Type"
              value={vehicle.fuelType}
              onChange={(e) =>
                setVehicle({ fuelType: e.target.value as FuelType })
              }
              options={[
                { value: "gasoline", label: "Gasoline" },
                { value: "diesel", label: "Diesel" },
                { value: "hybrid", label: "Hybrid" },
                { value: "electric", label: "Electric" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tank Size (gal)"
                type="number"
                value={vehicle.tankCapacityGallons}
                onChange={(e) =>
                  setVehicle({ tankCapacityGallons: Number(e.target.value) })
                }
                min={1}
                step={0.1}
              />
              <Input
                label="MPG"
                type="number"
                value={vehicle.fuelEfficiencyMpg}
                onChange={(e) =>
                  setVehicle({ fuelEfficiencyMpg: Number(e.target.value) })
                }
                min={1}
                step={0.1}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Current Fuel %"
                type="number"
                value={Math.round(vehicle.currentFuelLevel * 100)}
                onChange={(e) =>
                  setVehicle({ currentFuelLevel: Number(e.target.value) / 100 })
                }
                min={0}
                max={100}
                hint="% of full tank"
              />
              <Input
                label="Refuel Buffer %"
                type="number"
                value={Math.round(vehicle.safetyBufferPercent * 100)}
                onChange={(e) =>
                  setVehicle({
                    safetyBufferPercent: Number(e.target.value) / 100,
                  })
                }
                min={5}
                max={50}
                hint="Trigger refuel alert"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-4 py-3.5 md:py-3 text-left hover:bg-stone-50 active:bg-stone-100 transition-colors"
          onClick={() => setShowPreferences(!showPreferences)}
        >
          <span className="text-sm font-medium text-stone-800">
            Preferences
          </span>
          {showPreferences ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>
        {showPreferences && (
          <div className="border-t border-stone-100 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Max Drive (min)"
                type="number"
                value={preferences.maxDrivingDurationMinutes}
                onChange={(e) =>
                  setPreferences({
                    maxDrivingDurationMinutes: Number(e.target.value),
                  })
                }
                min={30}
                step={15}
              />
              <Input
                label="Break Every (min)"
                type="number"
                value={preferences.restFrequencyMinutes}
                onChange={(e) =>
                  setPreferences({
                    restFrequencyMinutes: Number(e.target.value),
                  })
                }
                min={30}
                step={15}
              />
            </div>

            <Select
              label="Fuel Budget"
              value={preferences.fuelBudgetLevel}
              onChange={(e) =>
                setPreferences({
                  fuelBudgetLevel: e.target.value as BudgetLevel,
                })
              }
              options={Object.entries(BUDGET_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <Select
              label="Dining Budget"
              value={preferences.dining.budgetLevel}
              onChange={(e) =>
                setDiningPreferences({
                  budgetLevel: e.target.value as BudgetLevel,
                })
              }
              options={Object.entries(BUDGET_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">
                Cuisine Preferences
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CUISINE_OPTIONS.map((cuisine) => (
                  <button
                    key={cuisine}
                    type="button"
                    className={`rounded-full px-3 py-1.5 md:px-2.5 md:py-1 text-xs font-medium transition-colors ${
                      preferences.dining.cuisineTypes.includes(cuisine)
                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                        : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100 hover:text-stone-600"
                    }`}
                    onClick={() => {
                      const current = preferences.dining.cuisineTypes;
                      const updated = current.includes(cuisine)
                        ? current.filter((c) => c !== cuisine)
                        : [...current, cuisine];
                      setDiningPreferences({ cuisineTypes: updated });
                    }}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">
                Dietary Restrictions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_OPTIONS.map((diet) => (
                  <button
                    key={diet}
                    type="button"
                    className={`rounded-full px-3 py-1.5 md:px-2.5 md:py-1 text-xs font-medium transition-colors ${
                      preferences.dining.dietaryRestrictions.includes(diet)
                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                        : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100 hover:text-stone-600"
                    }`}
                    onClick={() => {
                      const current = preferences.dining.dietaryRestrictions;
                      const updated = current.includes(diet)
                        ? current.filter((d) => d !== diet)
                        : [...current, diet];
                      setDiningPreferences({ dietaryRestrictions: updated });
                    }}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">
                Preferred Gas Brands
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GAS_STATION_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className={`rounded-full px-3 py-1.5 md:px-2.5 md:py-1 text-xs font-medium transition-colors ${
                      preferences.preferredBrands.includes(brand)
                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                        : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100 hover:text-stone-600"
                    }`}
                    onClick={() => {
                      const current = preferences.preferredBrands;
                      const updated = current.includes(brand)
                        ? current.filter((b) => b !== brand)
                        : [...current, brand];
                      setPreferences({ preferredBrands: updated });
                    }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.avoidHighways}
                onChange={(e) =>
                  setPreferences({ avoidHighways: e.target.checked })
                }
                className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              Avoid highways
            </label>
          </div>
        )}
      </div>

      {routeError && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
          {routeError}
        </div>
      )}

      <Button
        onClick={handlePlanTrip}
        isLoading={isLoadingRoute}
        disabled={!originInput.trim() || !destinationInput.trim()}
        size="lg"
        className="w-full"
      >
        Plan Route
      </Button>
    </div>
  );
}
