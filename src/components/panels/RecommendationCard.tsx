"use client";

import { Fuel, Hotel, Star, TreePine, UtensilsCrossed, X, Plus, Check } from "lucide-react";
import { useTripStore } from "@/store/tripStore";
import { formatDistance, formatPriceLevel, cn } from "@/lib/utils";
import { STOP_CATEGORY_CONFIG } from "@/lib/constants";
import type { Recommendation, Stop, ScoredStop, StopCategory } from "@/types";

const categoryIcon: Record<StopCategory, React.ReactNode> = {
  fuel: <Fuel className="h-3 w-3" />,
  restaurant: <UtensilsCrossed className="h-3 w-3" />,
  rest: <TreePine className="h-3 w-3" />,
  hotel: <Hotel className="h-3 w-3" />,
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
  const config = STOP_CATEGORY_CONFIG[recommendation.category];
  const hasAccepted = recommendation.acceptedStopId !== null;

  return (
    <div className={cn(
      "rounded-lg border bg-white overflow-hidden transition-colors",
      hasAccepted ? "border-brand-200 bg-brand-50/30" : "border-stone-200",
    )}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-100">
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-white"
          style={{ backgroundColor: config.color }}
        >
          {categoryIcon[recommendation.category]}
        </span>
        <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide flex-1">
          {config.label}
        </span>
        <span className="text-[10px] text-stone-400 mr-1">
          {recommendation.triggerReason}
        </span>
        <button
          onClick={() => dismissRecommendation(recommendation.id)}
          className="rounded p-0.5 text-stone-300 hover:text-stone-500 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {displayStops.slice(0, 3).map((stop, index) => (
        <StopRow
          key={stop.id}
          stop={stop}
          rank={index + 1}
          categoryColor={config.color}
          isAccepted={recommendation.acceptedStopId === stop.id}
          onAccept={() => acceptRecommendation(recommendation.id, stop.id)}
          showDivider={index > 0}
        />
      ))}
    </div>
  );
}

function StopRow({
  stop,
  rank,
  categoryColor,
  isAccepted,
  onAccept,
  showDivider,
}: {
  stop: Stop;
  rank: number;
  categoryColor: string;
  isAccepted: boolean;
  onAccept: () => void;
  showDivider: boolean;
}) {
  const scored = isScoredStop(stop);
  const matchPercent = scored ? Math.round(stop.score * 100) : null;
  const matchReasons = scored ? stop.matchReasons.slice(0, 2).join(" • ") : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5",
        showDivider && "border-t border-stone-50",
        isAccepted && "bg-brand-50/50",
      )}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: categoryColor, opacity: 1 - (rank - 1) * 0.15 }}
      >
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-stone-800">
            {stop.name}
          </span>
          {matchPercent !== null && (
            <span className="shrink-0 text-[10px] font-semibold text-stone-400 tabular-nums">
              {matchPercent}%
            </span>
          )}
        </div>
        {matchReasons && (
          <p className="truncate text-[10px] text-stone-500">
            {matchReasons}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 text-[10px] text-stone-400">
        {stop.rating !== null && (
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {stop.rating.toFixed(1)}
          </span>
        )}
        {stop.priceLevel !== null && (
          <span>{formatPriceLevel(stop.priceLevel)}</span>
        )}
        <span className="text-stone-300">·</span>
        <span>{formatDistance(stop.detourDistanceMiles)}</span>
      </div>

      {isAccepted ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <button
          onClick={onAccept}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-200 text-stone-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          aria-label="Add stop"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
