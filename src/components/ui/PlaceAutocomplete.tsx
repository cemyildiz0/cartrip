"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Prediction {
  placeId: string;
  description: string;
}

interface PlaceAutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function PlaceAutocomplete({
  label,
  placeholder,
  value,
  onChange,
}: PlaceAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputId = label?.toLowerCase().replace(/\s+/g, "-");

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`,
      );
      const data = await res.json();
      if (data.predictions?.length) {
        setPredictions(data.predictions);
        setIsOpen(true);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = (description: string) => {
    onChange(description);
    setPredictions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < predictions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex].description);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-stone-600">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "rounded-lg border border-stone-200 bg-white px-3 py-2.5 md:py-2 text-base md:text-sm text-stone-900 placeholder:text-stone-400 transition-colors",
          "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15",
        )}
      />
      {isLoading && (
        <div className="absolute right-3 top-[calc(100%-1.75rem)] md:top-[calc(100%-1.5rem)]">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-brand-500" />
        </div>
      )}
      {isOpen && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          {predictions.map((p, idx) => (
            <li
              key={p.placeId}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm text-stone-700 transition-colors",
                idx === activeIndex && "bg-brand-50 text-brand-700",
                idx !== activeIndex && "hover:bg-stone-50",
              )}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p.description);
              }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
