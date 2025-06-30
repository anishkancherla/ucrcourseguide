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
          "relative overflow-hidden transition-all duration-300",
          // Mobile: Clear, readable styling with important to override inline styles
          "bg-white/80 hover:bg-white/90 border-white/40 text-gray-800",
          // Desktop: Glass effect styling
          "md:!bg-white/10 md:hover:!bg-white/20 md:!border-white/20 md:!text-white",
          "shadow-lg hover:shadow-xl hover:scale-105",
          // Backdrop blur - desktop only
          "md:backdrop-blur-sm md:supports-[backdrop-filter]:backdrop-blur-sm",
          // Ensure text contrast
          "font-medium",
          className
        )}
        variant={variant}
        size={size}
        asChild={asChild}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          // Glass effect - will be overridden by CSS classes on mobile
          background: isHovered 
            ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,${glassIntensity}) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)`
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