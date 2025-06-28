"use client"

import { useState } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsDisplay } from "@/components/results-display"
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
  }
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
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string) => {
    if (!query) return
    setIsLoading(true)
    setResults(null)

    try {
      // call our backend for ai course analysis
      const response = await fetch(`https://courselens-production.up.railway.app/api/course-analysis?keyword=${encodeURIComponent(query)}&max_posts=100&max_comments=100`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.ai_analysis) {
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

        // use ai summary as main content
        const aiSummary = data.ai_analysis.ai_summary || 'AI analysis completed successfully.'
        
        setResults({
          summary: aiSummary,
          links: links.slice(0, 8), // show top reddit posts
          totalPosts: data.posts_analyzed,
          keyword: query,
          ucr_database_included: data.ucr_database_included,
          raw_data: data.raw_data,
          ai_analysis: data.ai_analysis
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

  return (
    <div className="relative min-h-screen w-full">
      <GradientBackground />
      <div className="relative h-full">
        <main className="flex flex-col items-center justify-center p-4 md:p-8 min-h-screen">
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
          </div>
          <div className="w-full space-y-8">
            {!results && !isLoading && <SearchForm onSearch={handleSearch} />}
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-white/80">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white/80"></div>
                <p className="mt-4 text-lg">Analyzing UCR community discussions...</p>
                <p className="mt-2 text-sm text-white/60">this may take 30-60 seconds</p>
              </div>
            )}
            {results && <ResultsDisplay results={results} onReset={() => setResults(null)} />}
          </div>
        </main>
      </div>
    </div>
  )
}
