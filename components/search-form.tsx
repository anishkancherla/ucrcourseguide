"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { LiquidGlassContainer } from "@/components/ui/liquid-glass-container"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Image from "next/image"
import ucrLogo from "@/app/images/ucrlogo.png"

interface SearchFormProps {
  onSearch: (query: string) => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <LiquidGlassContainer 
      variant="default"
      disableInteractive={true}
      className="flex flex-col items-center justify-center space-y-8 p-12 text-center text-white md:p-16"
    >
      <div className="flex flex-col items-center space-y-6">
        <Image 
          src={ucrLogo}
          alt="UCR Logo"
          width={120}
          height={120}
          className="object-contain"
        />
        <div className="space-y-4">
          <h1 className="text-4xl font-diatype-bold tracking-tight md:text-5xl">UCR Course Guide</h1>
          <p className="max-w-lg text-lg text-white/80 leading-relaxed">
            Type any valid UCR course ID to generate a comprehensive course guide with workload, difficulty, professor ratings, study advice, and more. We scan every relevant post on{" "}
            <a 
              href="https://www.reddit.com/r/ucr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              r/ucr
            </a>
            {" "}and the{" "}
            <a 
              href="https://docs.google.com/spreadsheets/d/1qiy_Oi8aFiPmL4QSTR3zHe74kmvc6e_159L1mAUUlU0/edit?gid=0#gid=0"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Class Difficulty Database
            </a>
            {" "}to extract essential insights.
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex w-full max-w-lg items-center space-x-3 mt-8">
        <Input
          type="text"
          placeholder="e.g., 'CS111', 'PSYC001', 'HIST010'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-white/20 text-white placeholder:text-white/60 border-white/30 focus:ring-white/50 h-12 text-base"
        />
        <LiquidGlassButton 
          type="submit" 
          size="icon"
          glassIntensity={0.4}
          className="bg-white/20 hover:bg-white/30 h-12 w-12"
        >
          <Search className="h-6 w-6 text-white" />
        </LiquidGlassButton>
      </form>
    </LiquidGlassContainer>
  )
}
