"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { LiquidGlassContainer } from "@/components/ui/liquid-glass-container"
import { Input } from "@/components/ui/input"
import { Search, User, BookOpen } from "lucide-react"
import Image from "next/image"
import ucrLogo from "@/app/images/ucrlogo.png"

interface SearchFormProps {
  onSearch: (query: string, searchType: 'course' | 'professor') => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const [searchType, setSearchType] = useState<'course' | 'professor'>('course')
  const [query, setQuery] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(query, searchType)
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
            Search for UCR courses or professors to get comprehensive guides with workload, difficulty, ratings, study advice, and more. We analyze{" "}
            <a 
              href="https://www.reddit.com/r/ucr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              r/ucr
            </a>
            {", "}
            <a 
              href="https://docs.google.com/spreadsheets/d/1qiy_Oi8aFiPmL4QSTR3zHe74kmvc6e_159L1mAUUlU0/edit?gid=0#gid=0"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Class Difficulty Database
            </a>
            {", and "}
            <a 
              href="https://www.ratemyprofessors.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Rate My Professors
            </a>
            {" "}to extract essential insights.
          </p>
        </div>
      </div>
      
      {/* Search Type Toggle */}
      <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setSearchType('course')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            searchType === 'course'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Search Courses
        </button>
        <button
          type="button"
          onClick={() => setSearchType('professor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            searchType === 'professor'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <User className="h-4 w-4" />
          Search Professors
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-lg space-y-4">
        <div className="flex items-center space-x-3">
          <Input
            type="text"
            placeholder={
              searchType === 'course' 
                ? "e.g., 'CS111', 'PSYC001', 'HIST010'" 
                : "e.g., 'Annie Ditta', 'Raj Singh'"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-white/20 text-white placeholder:text-white/60 border-white/30 focus:ring-white/50 h-12 text-base"
          />
          <LiquidGlassButton 
            type="submit" 
            size="icon"
            glassIntensity={0.2}
            className="bg-white/5 hover:bg-white/10 border-white/30 h-12 w-12"
          >
            <Search className="h-6 w-6 text-black md:text-white" />
          </LiquidGlassButton>
        </div>
        

      </form>
      
      {/* Search Type Description */}
      <div className="text-sm text-white/60 max-w-lg">
        {searchType === 'course' ? (
          <p>Search for any UCR course to see difficulty, professor reviews, study tips, and student experiences.</p>
        ) : (
          <p>Search for any UCR professor to see their ratings, teaching style, and student reviews across all courses they teach.</p>
        )}
      </div>
    </LiquidGlassContainer>
  )
}
