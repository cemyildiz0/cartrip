import { create } from "zustand";
import type {
  LatLng,
  Location,
  Recommendation,
  RouteData,
  Stop,
  StopCategory,
  TripContext,
  TripStatus,
  SimulationState,
} from "@/types";
import { generateId, getTimeOfDay } from "@/lib/utils";

interface TripState {
  status: TripStatus;
  origin: Location | null;
  destination: Location | null;
  route: RouteData | null;
  isLoadingRoute: boolean;
  routeError: string | null;
  context: TripContext;
  scheduledStops: Stop[];
  recommendations: Recommendation[];
  activePanel: "setup" | "overview" | "recommendation" | null;
  selectedRecommendationId: string | null;
  simulation: SimulationState | null;
  simulationIntervalId: number | null;
  simPausedForRecs: boolean;
  simShouldResume: boolean;
}

interface TripActions {
  setOrigin: (location: Location | null) => void;
  setDestination: (location: Location | null) => void;
  setRoute: (route: RouteData) => void;
  setRouteLoading: (loading: boolean) => void;
  setRouteError: (error: string | null) => void;
  startTrip: () => void;
  pauseTrip: () => void;
  resumeTrip: () => void;
  endTrip: () => void;
  resetTrip: () => void;
  updatePosition: (position: LatLng) => void;
  updateFuelLevel: (level: number) => void;
  updateContext: (partial: Partial<TripContext>) => void;
  addScheduledStop: (stop: Stop) => void;
  removeScheduledStop: (stopId: string) => void;
  reorderScheduledStops: (stops: Stop[]) => void;
  addRecommendation: (
    category: StopCategory,
    trigger: Recommendation["trigger"],
    triggerReason: string,
    stops: Stop[],
  ) => void;
  addRecommendations: (recs: Recommendation[]) => void;
  dismissRecommendation: (recommendationId: string) => void;
  acceptRecommendation: (recommendationId: string, stopId: string) => void;
  clearRecommendations: () => void;
  setActivePanel: (panel: TripState["activePanel"]) => void;
  setSelectedRecommendation: (id: string | null) => void;
  setSimulation: (sim: SimulationState | null) => void;
  setSimulationInterval: (id: number | null) => void;
  setSimulationSpeed: (speed: number) => void;
  stopSimulation: () => void;
  clearSimShouldResume: () => void;
}

const initialContext: TripContext = {
  elapsedDrivingMinutes: 0,
  estimatedFuelRemaining: 1.0,
  estimatedMilesRemaining: 0,
  distanceTraveledMiles: 0,
  currentPosition: null,
  currentSegmentIndex: 0,
  timeOfDay: getTimeOfDay(new Date()),
  lastStopTime: null,
  minutesSinceLastStop: 0,
  lastStopCategory: null,
  lastMealTime: null,
  lastMealSlot: null,
  lastHotelTime: null,
};

function hasUnresolvedRecs(recommendations: Recommendation[]): boolean {
  return recommendations.some((r) => !r.dismissed && !r.acceptedStopId);
}

export const useTripStore = create<TripState & TripActions>()((set, get) => ({
  status: "planning",
  origin: null,
  destination: null,
  route: null,
  isLoadingRoute: false,
  routeError: null,
  context: { ...initialContext },
  scheduledStops: [],
  recommendations: [],
  activePanel: "setup",
  selectedRecommendationId: null,
  simulation: null,
  simulationIntervalId: null,
  simPausedForRecs: false,
  simShouldResume: false,

  setOrigin: (location) => set({ origin: location }),
  setDestination: (location) => set({ destination: location }),

  setRoute: (route) =>
    set({
      route,
      routeError: null,
      context: {
        ...get().context,
        estimatedMilesRemaining: route.totalDistanceMiles,
      },
    }),

  setRouteLoading: (loading) => set({ isLoadingRoute: loading }),
  setRouteError: (error) => set({ routeError: error, isLoadingRoute: false }),

  startTrip: () =>
    set({
      status: "active",
      activePanel: "overview",
      context: {
        ...get().context,
        timeOfDay: getTimeOfDay(new Date()),
      },
    }),

  pauseTrip: () => set({ status: "paused" }),
  resumeTrip: () => set({ status: "active" }),
  endTrip: () => {
    const { simulationIntervalId } = get();
    if (simulationIntervalId) clearInterval(simulationIntervalId);
    set({
      status: "completed",
      activePanel: "overview",
      simulation: null,
      simulationIntervalId: null,
      simPausedForRecs: false,
      simShouldResume: false,
    });
  },

  resetTrip: () => {
    const { simulationIntervalId } = get();
    if (simulationIntervalId) clearInterval(simulationIntervalId);
    set({
      status: "planning",
      origin: null,
      destination: null,
      route: null,
      isLoadingRoute: false,
      routeError: null,
      context: { ...initialContext },
      scheduledStops: [],
      recommendations: [],
      activePanel: "setup",
      selectedRecommendationId: null,
      simulation: null,
      simulationIntervalId: null,
      simPausedForRecs: false,
      simShouldResume: false,
    });
  },

  updatePosition: (position) =>
    set((state) => ({
      context: { ...state.context, currentPosition: position },
    })),

  updateFuelLevel: (level) =>
    set((state) => ({
      context: { ...state.context, estimatedFuelRemaining: level },
    })),

  updateContext: (partial) =>
    set((state) => ({
      context: { ...state.context, ...partial },
    })),

  addScheduledStop: (stop) =>
    set((state) => ({
      scheduledStops: [...state.scheduledStops, stop],
    })),

  removeScheduledStop: (stopId) =>
    set((state) => ({
      scheduledStops: state.scheduledStops.filter((s) => s.id !== stopId),
    })),

  reorderScheduledStops: (stops) => set({ scheduledStops: stops }),

  addRecommendation: (category, trigger, triggerReason, stops) =>
    set((state) => ({
      recommendations: [
        ...state.recommendations,
        {
          id: generateId(),
          category,
          trigger,
          triggerReason,
          stops,
          timestamp: new Date(),
          dismissed: false,
          acceptedStopId: null,
        },
      ],
      activePanel: "recommendation",
    })),

  dismissRecommendation: (recommendationId) => {
    const state = get();
    const updated = state.recommendations.map((r) =>
      r.id === recommendationId ? { ...r, dismissed: true } : r,
    );
    const shouldResume = state.simPausedForRecs && !hasUnresolvedRecs(updated);
    set({
      recommendations: updated,
      ...(shouldResume
        ? { simPausedForRecs: false, simShouldResume: true }
        : {}),
    });
  },

  acceptRecommendation: (recommendationId, stopId) => {
    const state = get();
    const rec = state.recommendations.find((r) => r.id === recommendationId);
    const acceptedStop = rec?.stops.find((s) => s.id === stopId);
    const isFuelStop = rec?.category === "fuel";
    const acceptedAt = state.simulation?.simulatedTime ?? new Date();
    const updated = state.recommendations.map((r) =>
      r.id === recommendationId ? { ...r, acceptedStopId: stopId } : r,
    );
    // Auto-dismiss remaining unresolved recs in the batch
    const finalRecs = updated.map((r) =>
      !r.dismissed && !r.acceptedStopId ? { ...r, dismissed: true } : r,
    );
    set({
      recommendations: finalRecs,
      scheduledStops: acceptedStop
        ? [...state.scheduledStops, acceptedStop]
        : state.scheduledStops,
      context: {
        ...state.context,
        // Every accepted stop counts as a break — reset driving timer
        lastStopTime: acceptedAt,
        minutesSinceLastStop: 0,
        lastStopCategory: rec?.category ?? state.context.lastStopCategory,
        ...(rec?.category === "restaurant"
          ? {
              lastMealTime: acceptedAt,
              lastMealSlot:
                acceptedAt.getHours() < 11
                  ? "breakfast"
                  : acceptedAt.getHours() < 15
                    ? "lunch"
                    : "dinner",
            }
          : {}),
        ...(rec?.category === "hotel"
          ? {
              lastHotelTime: acceptedAt,
            }
          : {}),
        ...(isFuelStop ? { estimatedFuelRemaining: 1.0 } : {}),
      },
      activePanel: "overview",
      simPausedForRecs: false,
      simShouldResume: true,
    });
  },

  addRecommendations: (recs) => {
    const state = get();
    if (recs.length === 0) return;
    // Pause simulation while user reviews recommendations
    if (state.simulationIntervalId) {
      clearInterval(state.simulationIntervalId);
    }
    // Dismiss ALL old active recs so only the current batch matters for resume
    const updated = state.recommendations.map((r) =>
      !r.dismissed && !r.acceptedStopId ? { ...r, dismissed: true } : r,
    );
    set({
      recommendations: [...updated, ...recs],
      activePanel: "recommendation",
      simulation: state.simulation
        ? { ...state.simulation, isRunning: false }
        : null,
      simulationIntervalId: null,
      simPausedForRecs: true,
      simShouldResume: false,
    });
  },

  clearRecommendations: () => set({ recommendations: [] }),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedRecommendation: (id) => set({ selectedRecommendationId: id }),

  setSimulation: (sim) => set({ simulation: sim }),

  setSimulationInterval: (id) => set({ simulationIntervalId: id }),

  setSimulationSpeed: (speed) =>
    set((state) => ({
      simulation: state.simulation ? { ...state.simulation, speed } : null,
    })),

  clearSimShouldResume: () =>
    set({ simShouldResume: false }),

  stopSimulation: () => {
    const { simulationIntervalId } = get();
    if (simulationIntervalId) clearInterval(simulationIntervalId);
    set((state) => ({
      simulation: state.simulation
        ? { ...state.simulation, isRunning: false }
        : null,
      simulationIntervalId: null,
    }));
  },
}));
