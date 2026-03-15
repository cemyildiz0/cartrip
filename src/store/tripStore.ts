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
};

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
  endTrip: () => set({ status: "completed", activePanel: null }),

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

  dismissRecommendation: (recommendationId) =>
    set((state) => ({
      recommendations: state.recommendations.map((r) =>
        r.id === recommendationId ? { ...r, dismissed: true } : r,
      ),
    })),

  acceptRecommendation: (recommendationId, stopId) =>
    set((state) => {
      const rec = state.recommendations.find((r) => r.id === recommendationId);
      const acceptedStop = rec?.stops.find((s) => s.id === stopId);
      return {
        recommendations: state.recommendations.map((r) =>
          r.id === recommendationId ? { ...r, acceptedStopId: stopId } : r,
        ),
        scheduledStops: acceptedStop
          ? [...state.scheduledStops, acceptedStop]
          : state.scheduledStops,
      };
    }),

  addRecommendations: (recs) =>
    set((state) => ({
      recommendations: [...state.recommendations, ...recs],
      activePanel: recs.length > 0 ? "recommendation" : state.activePanel,
    })),

  clearRecommendations: () => set({ recommendations: [] }),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedRecommendation: (id) => set({ selectedRecommendationId: id }),

  setSimulation: (sim) => set({ simulation: sim }),

  setSimulationInterval: (id) => set({ simulationIntervalId: id }),

  setSimulationSpeed: (speed) =>
    set((state) => ({
      simulation: state.simulation ? { ...state.simulation, speed } : null,
    })),

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
