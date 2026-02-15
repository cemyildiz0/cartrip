"use client";

import { Sparkles } from "lucide-react";
import { useTripStore } from "@/store/tripStore";
import RecommendationCard from "./RecommendationCard";

export default function RecommendationsPanel() {
  const recommendations = useTripStore((s) => s.recommendations);
  const activeRecommendations = recommendations.filter((r) => !r.dismissed);

  if (activeRecommendations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <Sparkles className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-500">
            No recommendations yet
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Recommendations will appear as context triggers activate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-8 md:pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">
          Recommendations
        </h2>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
          {activeRecommendations.length}
        </span>
      </div>
      {activeRecommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </div>
  );
}
