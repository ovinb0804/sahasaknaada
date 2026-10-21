import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "glass" | "gold" | "subtle";
  size?: "sm" | "default" | "lg";
}

/**
 * LiquidGlassButton — Apple macOS / VisionOS / iOS 18 liquid glass button.
 * Translucent frosted glass over dark surfaces with specular top-edge bevel,
 * crisp 1px rim, subtle backdrop blur, and fluid micro-interactions.
 */
export const LiquidGlassButton = React.forwardRef<
  HTMLButtonElement,
  LiquidGlassButtonProps
>(
  (
    {
      className,
      children,
      asChild = false,
      variant = "glass",
      size = "default",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const sizeClasses = {
      sm: "h-9 px-4 py-1.5 text-xs rounded-xl",
      default: "h-11 px-5 py-2.5 text-sm rounded-2xl",
      lg: "h-13 px-7 py-3 text-base rounded-2xl",
    }[size];

    const variantClasses = {
      glass: "apple-liquid-glass",
      gold: "apple-liquid-glass apple-liquid-glass-gold",
      subtle:
        "apple-liquid-glass bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]",
    }[variant];

    return (
      <Comp
        ref={ref}
        className={cn(variantClasses, sizeClasses, className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

LiquidGlassButton.displayName = "LiquidGlassButton";
