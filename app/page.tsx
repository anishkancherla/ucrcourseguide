"use client"

import { useState } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsDisplay } from "@/components/results-display"
import { StructuredResultsDisplay } from "@/components/structured-results-display"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { GradientBackground } from "@/components/gradient-background"

interface RedditLink {
  title: string
  url: string
  subreddit?: string
  score?: number
  comments?: number
}

interface PostData {
  post: {
    title: string
    url: string
    subreddit: string
    score: number
    num_comments: number
    selftext?: string
  }
  comments: Array<{
    body: string
    score: number
  }>
}

interface SearchResults {
  summary: string
  links: RedditLink[]
  totalPosts?: number
  keyword?: string
  error?: string
  ucr_database_included?: boolean
  raw_data?: {
    course: string
    posts: PostData[]
    ucr_database: string
  }
  ai_analysis?: {
    success: boolean
    course: string
    ai_summary: string
    analysis_metadata?: {
      total_posts_analyzed: number
      total_comments_analyzed: number
      model_used: string
      ucr_database_included?: boolean
    }
  }
  structured_data?: {
    overall_sentiment?: {
      summary: string
      workload?: {
        hours_per_week: string
        assignments: string
        time_commitment: string
      }
      minority_opinions?: string[]
    }
    difficulty?: {
      rank: string
      rating: number
      max_rating: number
      explanation: string[]
      minority_opinions?: string[]
    }
    professors?: Array<{
      name: string
      rating: number
      max_rating: number
      reviews: Array<{
        source: string
        date: string
        text: string
      }>
      minority_opinions?: string[]
    }>
    advice?: {
      course_specific_tips: string[]
      resources: string[]
      minority_opinions?: string[]
    }
    common_pitfalls?: string[]
    grade_distribution?: string
  }
  analysis_metadata?: {
    total_posts_analyzed: number
    total_comments_analyzed: number
    model_used: string
    ucr_database_included?: boolean
  }
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)

  const handleSearch = async (query: string) => {
    if (!query) return
    setIsLoading(true)
    setResults(null)

    try {
      // call our backend for structured ai course analysis
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://courselens-production.up.railway.app' 
        : 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/course-analysis-structured?keyword=${encodeURIComponent(query)}&max_posts=100&max_comments=100`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.analysis && data.analysis.structured_data) {
        // get reddit links from raw data if ai worked
        const links: RedditLink[] = []
        
        // if we have raw_data, extract links; otherwise use metadata for context
        if (data.raw_data && data.raw_data.posts) {
          data.raw_data.posts.forEach((postData: PostData) => {
            if (postData.post) {
              links.push({
                title: postData.post.title,
                url: postData.post.url,
                subreddit: postData.post.subreddit,
                score: postData.post.score,
                comments: postData.post.num_comments
              })
            }
          })
        }

        // use structured data
        setResults({
          summary: data.analysis.structured_data.overall_sentiment?.summary || 'Analysis completed successfully.',
          links: links.slice(0, 8), // show top reddit posts
          totalPosts: data.posts_analyzed,
          keyword: query,
          ucr_database_included: data.ucr_database_included,
          raw_data: data.raw_data,
          structured_data: data.analysis.structured_data, // NEW: structured data
          analysis_metadata: data.analysis.analysis_metadata
        })
      } else if (data.success && data.raw_data) {
        // fallback: if ai failed but we have raw data
        const links: RedditLink[] = []
        data.raw_data.posts.forEach((postData: PostData) => {
          if (postData.post) {
            links.push({
              title: postData.post.title,
              url: postData.post.url,
              subreddit: postData.post.subreddit,
              score: postData.post.score,
              comments: postData.post.num_comments
            })
          }
        })

        setResults({
          summary: `Found ${data.posts_analyzed} posts about '${query}' in r/ucr. AI analysis temporarily unavailable, but you can explore the community discussions below.`,
          links: links.slice(0, 8),
          totalPosts: data.posts_analyzed,
          keyword: query,
          ucr_database_included: data.ucr_database_included,
          raw_data: data.raw_data
        })
      } else {
        throw new Error('No course data found')
      }
    } catch (error) {
      console.error('Course analysis error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setResults({
        summary: `Sorry, we couldn't analyze '${query}' right now. Please make sure the backend server is running and try again. Error: ${errorMessage}`,
        links: [],
        error: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      const shareText = results 
        ? `Check out this UCR course analysis for ${results.keyword?.toUpperCase()}: ${shareUrl}`
        : `UCR Course Guide - Get insights on UCR courses: ${shareUrl}`

      // Try to use native Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: 'UCR Course Guide',
          text: shareText,
          url: shareUrl,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl)
        setShowShareToast(true)
        setTimeout(() => setShowShareToast(false), 3000)
      }
    } catch (error) {
      console.error('Share failed:', error)
      // Fallback: try to copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        setShowShareToast(true)
        setTimeout(() => setShowShareToast(false), 3000)
      } catch (clipboardError) {
        console.error('Clipboard copy failed:', clipboardError)
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <GradientBackground />
      <div className="relative h-full">
        <main className="flex flex-col items-center justify-center p-4 md:p-8 min-h-screen">
          <div className={`absolute z-50 ${
            results 
              ? "top-4 right-4 md:top-6 md:right-6" 
              : "top-10 right-6 md:top-6 md:right-6"
          }`}>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white bg-black/20 backdrop-blur-sm border border-white/20" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
            
            {/* Toast notification */}
            {showShareToast && (
              <div className="absolute top-12 right-0 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in-0 slide-in-from-top-2 duration-300">
                Link copied to clipboard!
              </div>
            )}
          </div>
          <div
            className={`w-full space-y-8 transition-all duration-500 ${
              results ? "max-w-full px-4" : "max-w-2xl"
            }`}
          >
            {!results && !isLoading && <SearchForm onSearch={handleSearch} />}
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-white/80">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white/80"></div>
                <p className="mt-4 text-lg">Analyzing UCR community discussions...</p>
                <p className="mt-2 text-sm text-white/60">this may take 20-40 seconds</p>
              </div>
            )}
            {results && results.structured_data && (
              <StructuredResultsDisplay results={results} onReset={() => setResults(null)} />
            )}
            {results && !results.structured_data && (
              <ResultsDisplay results={results} onReset={() => setResults(null)} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
