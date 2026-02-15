"use client";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "fuel"
  | "restaurant"
  | "rest"
  | "hotel"
  | "warning"
  | "success";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-stone-100 text-stone-600",
  fuel: "bg-red-50 text-red-700",
  restaurant: "bg-amber-50 text-amber-700",
  rest: "bg-emerald-50 text-emerald-700",
  hotel: "bg-violet-50 text-violet-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
};

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
