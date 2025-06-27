"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { SearchForm } from "@/components/search-form"
import { ResultsDisplay } from "@/components/results-display"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { GradientBackground } from "@/components/gradient-background"

export default function HomePage() {
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string) => {
    if (!query) return
    setIsLoading(true)
    setResults(null)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Placeholder data
    const mockResults = {
      summary: `Based on community feedback, the main flaw in replica versions of '${query}' is the material quality, which often feels cheaper and less durable than the original. The stitching is another common issue, frequently being uneven or loose. Color accuracy can also be off, appearing slightly faded or having a different hue.`,
      links: [
        { title: `Review of ${query} from r/RepSneakers`, url: "#" },
        { title: `QC Check for ${query}`, url: "#" },
        { title: `[GUIDE] How to spot fakes of ${query}`, url: "#" },
      ],
    }

    setResults(mockResults)
    setIsLoading(false)
  }

  return (
    <div className="relative min-h-screen w-full">
      <GradientBackground />
      <div className="relative flex h-full">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
          </div>
          <div className="w-full max-w-2xl space-y-8">
            {!results && !isLoading && <SearchForm onSearch={handleSearch} />}
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-white/80">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white/80"></div>
                <p className="mt-4 text-lg">Analyzing Reddit threads...</p>
              </div>
            )}
            {results && <ResultsDisplay results={results} onReset={() => setResults(null)} />}
          </div>
        </main>
      </div>
    </div>
  )
}
