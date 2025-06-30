"use client"

import * as THREE from 'three'
import { useRef, useState, useEffect } from 'react'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { useFBO, MeshTransmissionMaterial } from '@react-three/drei'
import { easing } from 'maath'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  intensity?: number
  chromaticAberration?: number
  thickness?: number
  ior?: number
  damping?: number
}

export function LiquidGlass({ 
  children, 
  className = "", 
  intensity = 0.5,
  chromaticAberration = 0.04,
  thickness = 1.5,
  ior = 1.2,
  damping = 0.2
}: LiquidGlassProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Three.js overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Lens 
            isActive={isHovered}
            intensity={intensity}
            chromaticAberration={chromaticAberration}
            thickness={thickness}
            ior={ior}
            damping={damping}
          >
            <BackgroundScene />
          </Lens>
        </Canvas>
      </div>
    </div>
  )
}

function Lens({ 
  children, 
  isActive, 
  intensity,
  chromaticAberration,
  thickness,
  ior,
  damping,
  ...props 
}: {
  children: React.ReactNode
  isActive: boolean
  intensity: number
  chromaticAberration: number
  thickness: number
  ior: number
  damping: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  const buffer = useFBO()
  const viewport = useThree((state) => state.viewport)
  const [scene] = useState(() => new THREE.Scene())
  
  useFrame((state, delta) => {
    if (!ref.current) return
    
    // Create lens effect that follows mouse when active
    const currentViewport = state.viewport.getCurrentViewport(state.camera, [0, 0, 2])
    const targetX = isActive ? (state.pointer.x * currentViewport.width) / 4 : 0
    const targetY = isActive ? (state.pointer.y * currentViewport.height) / 4 : 0
    
    easing.damp3(
      ref.current.position,
      [targetX, targetY, 2],
      damping,
      delta
    )
    
    // Scale the lens based on hover state
    const targetScale = isActive ? intensity : 0.1
    easing.damp(ref.current.scale, 'x', targetScale, damping, delta)
    easing.damp(ref.current.scale, 'y', targetScale, damping, delta)
    easing.damp(ref.current.scale, 'z', targetScale, damping, delta)
    
    // Render the background scene to buffer
    state.gl.setRenderTarget(buffer)
    state.gl.setClearColor('#ffffff', 0)
    state.gl.render(scene, state.camera)
    state.gl.setRenderTarget(null)
  })
  
  return (
    <>
      {createPortal(children, scene)}
      
      {/* Background plane */}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent opacity={0.1} />
      </mesh>
      
      {/* Lens sphere */}
      <mesh ref={ref} {...props}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial 
          buffer={buffer.texture} 
          ior={ior} 
          thickness={thickness} 
          anisotropy={0.1} 
          chromaticAberration={chromaticAberration}
          transparent
          opacity={0.8}
        />
      </mesh>
    </>
  )
}

function BackgroundScene() {
  return (
    <>
      {/* Subtle gradient background */}
      <mesh scale={[20, 20, 1]} position={[0, 0, -5]}>
        <planeGeometry />
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Some geometric shapes for refraction */}
      <mesh position={[-2, 1, -2]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color="#e0e0e0" />
      </mesh>
      
      <mesh position={[2, -1, -3]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#d0d0d0" />
      </mesh>
      
      <mesh position={[0, 2, -1]}>
        <cylinderGeometry args={[0.2, 0.2, 1]} />
        <meshBasicMaterial color="#c0c0c0" />
      </mesh>
    </>
  )
} 