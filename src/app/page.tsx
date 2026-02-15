"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TripMap from "@/components/map/TripMap";
import TripSetupPanel from "@/components/panels/TripSetupPanel";
import TripOverviewPanel from "@/components/panels/TripOverviewPanel";
import RecommendationsPanel from "@/components/panels/RecommendationsPanel";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import { useTripStore } from "@/store/tripStore";
import { cn } from "@/lib/utils";

type SidebarTab = "setup" | "overview" | "recommendations";

export default function Home() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("setup");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const status = useTripStore((s) => s.status);
  const recommendations = useTripStore((s) => s.recommendations);
  const activeRecCount = recommendations.filter((r) => !r.dismissed).length;

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "overview", label: "Overview" },
    { id: "recommendations", label: "Recs" },
  ];

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-stone-50">
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col bg-white border-r border-stone-200 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-[var(--sidebar-width)]" : "w-0",
        )}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-5 py-4">
              <h1 className="text-lg font-bold tracking-tight text-stone-900">
                CARTriP
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex mx-4 rounded-lg bg-stone-100 p-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all",
                    activeTab === tab.id
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700",
                  )}
                >
                  {tab.label}
                  {tab.id === "recommendations" && activeRecCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                      {activeRecCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-2">
              {activeTab === "setup" && <TripSetupPanel />}
              {activeTab === "overview" && <TripOverviewPanel />}
              {activeTab === "recommendations" && <RecommendationsPanel />}
            </div>

            <div className="border-t border-stone-100 px-5 py-2.5 text-[11px] text-stone-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
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
              </span>
              <span className="text-stone-300">CS 125 — Group 34</span>
            </div>
          </>
        )}
      </aside>

      <main className="relative flex-1 min-w-0">
        <div className="md:hidden absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
          <div className="pointer-events-auto rounded-xl bg-white/90 backdrop-blur-md shadow-sm border border-stone-200/60 px-4 py-2">
            <h1 className="text-base font-bold tracking-tight text-stone-900">
              CARTriP
            </h1>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border border-stone-200/60 px-3 py-2 text-[11px] text-stone-500">
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
            <span className="capitalize font-medium">{status}</span>
          </div>
        </div>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex absolute left-3 bottom-3 z-10 h-9 w-9 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-stone-200/80 text-stone-500 hover:text-stone-700 hover:bg-white transition-colors"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <TripMap />
      </main>

      <MobileBottomSheet />
    </div>
  );
}
