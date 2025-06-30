"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SimpleLiquidGlassProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "subtle" | "intense"
  disableHoverScale?: boolean
}

const variantStyles = {
  default: "bg-white/80 hover:bg-white/90 border border-white/40 md:!bg-white/10 md:hover:!bg-white/15 md:!border-white/20 md:backdrop-blur-md md:supports-[backdrop-filter]:backdrop-blur-md",
  subtle: "bg-white/60 hover:bg-white/70 border border-white/30 md:!bg-white/5 md:hover:!bg-white/10 md:!border-white/10 md:backdrop-blur-sm md:supports-[backdrop-filter]:backdrop-blur-sm",
  intense: "bg-white/90 hover:bg-white/95 border border-white/50 md:!bg-white/15 md:hover:!bg-white/20 md:!border-white/30 md:backdrop-blur-lg md:supports-[backdrop-filter]:backdrop-blur-lg"
}

export function SimpleLiquidGlass({ 
  children, 
  className = "",
  variant = "default",
  disableHoverScale = false
}: SimpleLiquidGlassProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePosition({ x, y })
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300",
        "ring-1 ring-inset ring-white/10",
        // Mobile text color adjustment
        "text-gray-800 md:text-white",
        variantStyles[variant],
        isHovered && !disableHoverScale && "shadow-3xl scale-[1.02]",
        isHovered && disableHoverScale && "shadow-3xl",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // Glass effect for desktop - CSS classes will override on mobile
        background: isHovered 
          ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)`
          : undefined
      }}
    >
      {/* Animated glass effect overlay */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
          isHovered && "opacity-100"
        )}
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.1) 0%, transparent 70%)`
        }}
      />
      
      {/* Subtle animated border */}
      <div 
        className={cn(
          "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none",
          isHovered && "opacity-100"
        )}
        style={{
          background: `conic-gradient(from 0deg at ${mousePosition.x}% ${mousePosition.y}%, transparent 0deg, rgba(255,255,255,0.2) 90deg, transparent 180deg, rgba(255,255,255,0.1) 270deg, transparent 360deg)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '1px'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
} 