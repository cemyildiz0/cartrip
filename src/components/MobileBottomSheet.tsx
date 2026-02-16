"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, Navigation, Sparkles, X } from "lucide-react";
import TripSetupPanel from "@/components/panels/TripSetupPanel";
import TripOverviewPanel from "@/components/panels/TripOverviewPanel";
import RecommendationsPanel from "@/components/panels/RecommendationsPanel";
import { useTripStore } from "@/store/tripStore";
import { cn } from "@/lib/utils";

type MobileTab = "setup" | "overview" | "recommendations";

const SNAP_PEEK = 0.08; // Just tab bar visible
const SNAP_HALF = 0.5; // Half screen
const SNAP_FULL = 0.92; // Near full screen

export default function MobileBottomSheet() {
  const [activeTab, setActiveTab] = useState<MobileTab>("setup");
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const status = useTripStore((s) => s.status);
  const recommendations = useTripStore((s) => s.recommendations);
  const activeRecCount = recommendations.filter((r) => !r.dismissed).length;

  const isOpen = sheetHeight > SNAP_PEEK + 0.02;

  const snapToNearest = useCallback((currentHeight: number) => {
    const snaps = [SNAP_PEEK, SNAP_HALF, SNAP_FULL];
    let closest = snaps[0];
    let minDist = Math.abs(currentHeight - snaps[0]);
    for (const snap of snaps) {
      const dist = Math.abs(currentHeight - snap);
      if (dist < minDist) {
        minDist = dist;
        closest = snap;
      }
    }
    setSheetHeight(closest);
  }, []);

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      startY.current = clientY;
      startHeight.current = sheetHeight;
    },
    [sheetHeight],
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      const deltaY = startY.current - clientY;
      const deltaHeight = deltaY / window.innerHeight;
      const newHeight = Math.max(
        SNAP_PEEK,
        Math.min(SNAP_FULL, startHeight.current + deltaHeight),
      );
      setSheetHeight(newHeight);
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToNearest(sheetHeight);
  }, [isDragging, sheetHeight, snapToNearest]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove],
  );

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const openSheet = (tab: MobileTab) => {
    setActiveTab(tab);
    if (sheetHeight <= SNAP_PEEK + 0.02) {
      setSheetHeight(SNAP_HALF);
    }
  };

  const closeSheet = () => {
    setSheetHeight(SNAP_PEEK);
  };

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "setup",
      label: "Plan",
      icon: <Map className="h-5 w-5" />,
    },
    {
      id: "overview",
      label: "Route",
      icon: <Navigation className="h-5 w-5" />,
    },
    {
      id: "recommendations",
      label: "Recs",
      icon: <Sparkles className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="bottom-sheet-overlay md:hidden"
          style={{
            opacity: Math.min(1, (sheetHeight - SNAP_PEEK) / SNAP_HALF),
          }}
          onClick={closeSheet}
        />
      )}

      <div
        ref={sheetRef}
        className={cn("bottom-sheet md:hidden", isDragging && "dragging")}
        style={{
          transform: `translateY(${(1 - sheetHeight) * 100}%)`,
          height: "92vh",
        }}
      >
        <div
          className="bottom-sheet-handle"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
        />

        <div className="shrink-0 flex items-center px-3 pb-2">
          <nav className="flex flex-1 rounded-xl bg-stone-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => openSheet(tab.id)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-medium transition-all",
                  activeTab === tab.id && isOpen
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 active:text-stone-700",
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === "recommendations" && activeRecCount > 0 && (
                  <span className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                    {activeRecCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {isOpen && (
            <button
              onClick={closeSheet}
              className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 active:bg-stone-200"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar pb-safe">
          <div className="flex items-center gap-1.5 px-5 pb-1 text-[11px] text-stone-400">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "active"
                  ? "bg-emerald-500"
                  : status === "planning"
                    ? "bg-amber-400"
                    : "bg-stone-300",
              )}
            />
            <span className="capitalize">{status}</span>
          </div>

          {activeTab === "setup" && <TripSetupPanel />}
          {activeTab === "overview" && <TripOverviewPanel />}
          {activeTab === "recommendations" && <RecommendationsPanel />}
        </div>
      </div>
    </>
  );
}
