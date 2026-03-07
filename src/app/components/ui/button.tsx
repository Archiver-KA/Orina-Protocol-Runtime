import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[2px] focus-visible:ring-[#2CC295]/35",
  {
    variants: {
      variant: {
        default: "bg-[#2CC295] text-black hover:opacity-90 border-0",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 border-0",
        outline:
          "bg-transparent text-ui-secondary border border-ui-border hover:bg-[var(--t-surface-5)] hover:text-ui-primary",
        secondary:
          "bg-[rgba(255,255,255,0.03)] text-ui-primary hover:bg-[rgba(255,255,255,0.08)] border-0 backdrop-blur-[10px]",
        ghost:
          "bg-[rgba(255,255,255,0.05)] text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F1F5F9] border-0 font-medium",
        link: "text-[#2CC295] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3.5 py-1.5 has-[>svg]:px-3",
        lg: "h-11 px-6 py-3 has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
