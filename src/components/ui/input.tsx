import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Run the consumer's handler first so it can opt-in to custom Enter behavior
      onKeyDown?.(e);

      // Global rule: Enter on a single-line input must NEVER submit the parent form.
      // It only acts within the active field (handled by the consumer's onKeyDown above).
      // Multiline inputs use <textarea>, so this only affects <input>.
      if (
        e.key === "Enter" &&
        !e.defaultPrevented &&
        // Allow Enter to trigger explicit submit buttons via keyboard activation
        type !== "submit" &&
        type !== "button"
      ) {
        e.preventDefault();
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
