"use client"

import * as React from "react"
import { Button, buttonVariants } from "./button"
import { cn } from "@/lib/utils"
import { type VariantProps } from "class-variance-authority"

interface LiquidGlassButtonProps 
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  glassIntensity?: number
}

const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false,
    glassIntensity = 0.3,
    children,
    ...props 
  }, ref) => {
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = React.useState(false)

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePosition({ x, y })
    }

    return (
      <Button
        ref={ref}
        className={cn(
          "relative overflow-hidden backdrop-blur-sm transition-all duration-300",
          "bg-white/10 hover:bg-white/20 border border-white/20",
          "text-white shadow-lg hover:shadow-xl hover:scale-105",
          className
        )}
        variant={variant}
        size={size}
        asChild={asChild}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: isHovered 
            ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,${glassIntensity}) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`
            : undefined
        }}
        {...props}
      >
        {/* Animated glass effect overlay */}
        <div 
          className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
            isHovered && "opacity-100"
          )}
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.2) 0%, transparent 70%)`
          }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center">
          {children}
        </span>
      </Button>
    )
  }
)

LiquidGlassButton.displayName = "LiquidGlassButton"

export { LiquidGlassButton } 