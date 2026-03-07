"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium bg-transparent text-ui-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-ui-primary disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[#2CC295] data-[state=on]:text-black [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:ring-[2px] focus-visible:ring-[#2CC295]/35 outline-none transition-[background,color] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-ui-border bg-transparent hover:bg-[var(--t-surface-5)] hover:text-ui-primary",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
