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
        default: "bg-white/10 backdrop-blur-md border border-white/20",
        subtle: "bg-white/5 backdrop-blur-sm border border-white/10",
        intense: "bg-white/15 backdrop-blur-lg border border-white/30"
      }

      return (
        <div 
          ref={ref}
          className={cn(
            "relative overflow-hidden rounded-2xl shadow-2xl",
            "ring-1 ring-inset ring-white/10",
            variantStyles[variant],
            className
          )}
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