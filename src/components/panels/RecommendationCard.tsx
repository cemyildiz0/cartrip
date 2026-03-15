"use client";

import { Fuel, Hotel, Star, TreePine, UtensilsCrossed, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useTripStore } from "@/store/tripStore";
import { formatDistance, formatPriceLevel, formatRating } from "@/lib/utils";
import type { Recommendation, Stop, ScoredStop, StopCategory } from "@/types";

const categoryIcon: Record<StopCategory, React.ReactNode> = {
  fuel: <Fuel className="h-3.5 w-3.5" />,
  restaurant: <UtensilsCrossed className="h-3.5 w-3.5" />,
  rest: <TreePine className="h-3.5 w-3.5" />,
  hotel: <Hotel className="h-3.5 w-3.5" />,
};

const categoryLabel: Record<StopCategory, string> = {
  fuel: "Gas Station",
  restaurant: "Restaurant",
  rest: "Rest Stop",
  hotel: "Hotel",
};

function isScoredStop(stop: Stop): stop is ScoredStop {
  return "score" in stop;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const dismissRecommendation = useTripStore((s) => s.dismissRecommendation);
  const acceptRecommendation = useTripStore((s) => s.acceptRecommendation);

  if (recommendation.dismissed) return null;

  const displayStops = recommendation.scoredStops ?? recommendation.stops;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
        <Badge variant={recommendation.category}>
          {categoryIcon[recommendation.category]}
          {categoryLabel[recommendation.category]}
        </Badge>
        <button
          onClick={() => dismissRecommendation(recommendation.id)}
          className="rounded-full p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50/50 border-b border-stone-100">
        {recommendation.triggerReason}
      </div>

      <div className="divide-y divide-stone-50">
        {displayStops.slice(0, 3).map((stop, index) => (
          <StopOption
            key={stop.id}
            stop={stop}
            rank={index + 1}
            isAccepted={recommendation.acceptedStopId === stop.id}
            onAccept={() => acceptRecommendation(recommendation.id, stop.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StopOption({
  stop,
  rank,
  isAccepted,
  onAccept,
}: {
  stop: Stop;
  rank: number;
  isAccepted: boolean;
  onAccept: () => void;
}) {
  const scored = isScoredStop(stop);
  const matchPercent = scored ? Math.round(stop.score * 100) : null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 md:py-3 transition-colors ${
        isAccepted ? "bg-brand-50" : "hover:bg-stone-50 active:bg-stone-100"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-800 truncate">
            {stop.name}
          </p>
          {matchPercent !== null && (
            <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
              {matchPercent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
          {stop.rating !== null && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              {formatRating(stop.rating)}
            </span>
          )}
          {stop.priceLevel !== null && (
            <span>{formatPriceLevel(stop.priceLevel)}</span>
          )}
          <span>{formatDistance(stop.detourDistanceMiles)} detour</span>
          {stop.detourDurationMinutes > 0 && (
            <span>+{Math.round(stop.detourDurationMinutes)}m</span>
          )}
        </div>

        {scored && stop.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {stop.matchReasons.slice(0, 3).map((reason, i) => (
              <span
                key={i}
                className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>

      {isAccepted ? (
        <Badge variant="success">Added</Badge>
      ) : (
        <Button size="sm" variant="ghost" onClick={onAccept}>
          Add
        </Button>
      )}
    </div>
  );
}
