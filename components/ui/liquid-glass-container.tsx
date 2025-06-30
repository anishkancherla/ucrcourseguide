"use client"

import * as React from "react"
import { SimpleLiquidGlass } from "../simple-liquid-glass"
import { cn } from "@/lib/utils"

interface LiquidGlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "intense"
  disableInteractive?: boolean
}

const LiquidGlassContainer = React.forwardRef<HTMLDivElement, LiquidGlassContainerProps>(
  ({ 
    className,
    variant = "default",
    disableInteractive = false,
    children,
    ...props 
  }, ref) => {
    if (disableInteractive) {
      // Static glass container without cursor effects
      const variantStyles = {
        default: "bg-white/80 border border-white/40 md:!bg-white/10 md:!border-white/20 md:backdrop-blur-md md:supports-[backdrop-filter]:backdrop-blur-md",
        subtle: "bg-white/60 border border-white/30 md:!bg-white/5 md:!border-white/10 md:backdrop-blur-sm md:supports-[backdrop-filter]:backdrop-blur-sm",
        intense: "bg-white/90 border border-white/50 md:!bg-white/15 md:!border-white/30 md:backdrop-blur-lg md:supports-[backdrop-filter]:backdrop-blur-lg"
      }

      return (
        <div 
          ref={ref}
          className={cn(
            "relative overflow-hidden rounded-2xl shadow-2xl",
            "ring-1 ring-inset ring-white/10",
            // Mobile text color adjustment
            "text-gray-800 md:text-white",
            variantStyles[variant],
            className
          )}
          style={{
            // No inline styles needed - handled by CSS classes
          }}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <SimpleLiquidGlass
        variant={variant}
        disableHoverScale={true}
        className={cn("block", className)}
      >
        <div
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SimpleLiquidGlass>
    )
  }
)

LiquidGlassContainer.displayName = "LiquidGlassContainer"

export { LiquidGlassContainer } 