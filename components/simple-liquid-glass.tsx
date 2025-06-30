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
  default: "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:backdrop-blur-lg",
  subtle: "bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:backdrop-blur-md",
  intense: "bg-white/15 backdrop-blur-lg border border-white/30 hover:bg-white/20 hover:backdrop-blur-xl"
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
        variantStyles[variant],
        isHovered && !disableHoverScale && "shadow-3xl scale-[1.02]",
        isHovered && disableHoverScale && "shadow-3xl",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered 
          ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)`
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