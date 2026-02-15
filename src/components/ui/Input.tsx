"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-stone-600"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-lg border border-stone-200 bg-white px-3 py-2.5 md:py-2 text-base md:text-sm text-stone-900 placeholder:text-stone-400 transition-colors",
            "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15",
            "disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500",
            error &&
              "border-red-400 focus:border-red-400 focus:ring-red-500/15",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-stone-400">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
