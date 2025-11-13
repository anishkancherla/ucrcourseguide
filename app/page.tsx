"use client"

import { useState, useEffect } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsDisplay } from "@/components/results-display"
import { StructuredResultsDisplay } from "@/components/structured-results-display"
import { ProfessorResultsDisplay } from "@/components/professor-results-display"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { GradientBackground } from "@/components/gradient-background"

// Real-time Progress Loading Component  
const RealTimeLoadingSteps = ({ sessionId, searchType }: { sessionId: string; searchType: 'course' | 'professor' }) => {
  const [currentMessage, setCurrentMessage] = useState("Starting analysis...")
  const [progress, setProgress] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://courselens-production.up.railway.app' 
      : 'http://localhost:8000'

    const eventSource = new EventSource(`${apiBaseUrl}/api/progress/${sessionId}`)
    
    eventSource.onopen = () => {
      console.log('SSE Connection opened for session:', sessionId)
      setIsConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      try {
        console.log('SSE Message received:', event.data)
        const data = JSON.parse(event.data)
        
        if (data.heartbeat) {
          console.log('SSE Heartbeat received')
          return
        }
        
        if (data.step && data.message) {
          console.log('Progress update:', data)
          setCurrentMessage(data.message)
          if (data.progress !== undefined) {
            setProgress(data.progress)
          }
          
          // Special handling for connection states
          if (data.step === 'connected') {
            setIsConnected(true)
          } else if (data.step === 'waiting') {
            setIsConnected(false)
          }
        }
        
        if (data.step === 'complete' || data.step === 'error') {
          console.log('SSE Connection closing, step:', data.step)
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing progress data:', error, 'Raw data:', event.data)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('Progress stream error:', error)
      console.error('EventSource readyState:', eventSource.readyState)
      setIsConnected(false)
      
      // If connection fails completely, show fallback message
      if (eventSource.readyState === EventSource.CLOSED) {
        setCurrentMessage("Connection lost - analysis continuing in background...")
      }
    }
    
    return () => {
      eventSource.close()
    }
  }, [sessionId])

  return (
    <div className="flex flex-col items-center justify-center text-white/80">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white/80"></div>
      
      {/* Progress Bar */}
      <div className="mt-4 w-64 bg-white/20 rounded-full h-2">
        <div 
          className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Dynamic Message */}
      <div className="mt-4 h-8 flex items-center justify-center overflow-hidden">
        <p 
          key={currentMessage} // Key forces re-render for animation
          className="text-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out text-center"
        >
          {currentMessage}
        </p>
      </div>
      
      <p className="mt-2 text-sm text-white/60">
        this may take 20-40 seconds
      </p>
    </div>
  )
}

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
  }
  analysis_metadata?: {
    total_posts_analyzed: number
    total_comments_analyzed: number
    model_used: string
    ucr_database_included?: boolean
  }
}

interface ProfessorSearchResults {
  success: boolean
  professor_name: string
  course_filter?: string
  data_sources: {
    rmp_professors_found: number
    reddit_posts_analyzed: number
    reddit_comments_analyzed: number
    ucr_database_included: boolean
    total_rmp_reviews: number
  }
  analysis: {
    success: boolean
    analysis: {
      professor_info: {
        name: string
        course_focus: string
        primary_rating: number
        rating_source: string
        max_rating: number
        department: string
        rmp_link?: string
        total_reviews_analyzed: number
        sentiment_distribution: {
          positive: number
          neutral: number
          negative: number
        }
      }
      teaching_analysis: {
        teaching_style: string
        strengths: string[]
        weaknesses: string[]
        grading_style: string
        student_support: string
      }
      reviews: Array<{
        source: string
        date: string
        course: string
        rating: number
        text: string
        tags?: string[]
      }>
      course_breakdown: {
        courses_taught: string[]
        most_reviewed_course: string
        course_specific_notes: string
      }
      student_advice: {
        tips_for_success: string[]
        what_to_expect: string[]
        who_should_take: string
        who_should_avoid: string
      }
    }
  }
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [professorResults, setProfessorResults] = useState<ProfessorSearchResults | null>(null)
  const [searchType, setSearchType] = useState<'course' | 'professor'>('course')
  const [isLoading, setIsLoading] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Course selection handler for professor results
  const handleCourseSelect = async (professorName: string, courseCode: string) => {
    setIsLoading(true)
    setError(null)
    setResults(null)
    setProfessorResults(null)
    
    try {
      // Trigger new professor search
      await handleSearch(professorName, 'professor')
    } catch (error) {
      console.error('Error in course selection:', error)
      setError('Failed to search for the selected course')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string, type: 'course' | 'professor' = 'course') => {
    if (!query) return
    
    // Generate session ID for progress tracking
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
    
    setIsLoading(true)
    setSearchType(type)
    
    // Clear previous results
    setResults(null)
    setProfessorResults(null)

    try {
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://courselens-production.up.railway.app' 
        : 'http://localhost:8000'
      
      let response: Response
      
      if (type === 'professor') {
        // Professor search
        const params = new URLSearchParams({
          professor_name: query,
          max_posts: '100',
          max_comments_per_post: '100',
          session_id: newSessionId
        })
        
        response = await fetch(`${apiBaseUrl}/api/professor-analysis?${params}`)
      } else {
        // Course search  
        response = await fetch(`${apiBaseUrl}/api/course-analysis-structured?keyword=${encodeURIComponent(query)}&max_posts=100&max_comments=100&session_id=${encodeURIComponent(newSessionId)}`)
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (type === 'professor') {
        // Handle professor search results
        setProfessorResults(data)  // Pass all data including errors with available_courses
      } else {
        // Handle course search results
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
      }
    } catch (error) {
      console.error(`${type === 'professor' ? 'Professor' : 'Course'} analysis error:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      if (type === 'professor') {
        setProfessorResults({
          success: false,
          professor_name: query,
          course_filter: undefined,
          data_sources: {
            rmp_professors_found: 0,
            reddit_posts_analyzed: 0,
            reddit_comments_analyzed: 0,
            ucr_database_included: false,
            total_rmp_reviews: 0
          },
          analysis: {
            success: false,
            analysis: {} as any
          }
        })
      } else {
        setResults({
          summary: `Sorry, we couldn't analyze '${query}' right now. Please make sure the backend server is running and try again. Error: ${errorMessage}`,
          links: [],
          error: errorMessage
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      let shareText = `UCR Course Guide - Get insights on UCR courses and professors: ${shareUrl}`
      
      if (results && results.keyword) {
        shareText = `Check out this UCR course analysis for ${results.keyword.toUpperCase()}: ${shareUrl}`
      } else if (professorResults && professorResults.professor_name) {
        const courseText = professorResults.course_filter ? ` for ${professorResults.course_filter}` : ''
        shareText = `Check out this UCR professor analysis for ${professorResults.professor_name}${courseText}: ${shareUrl}`
      }

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

  const handleReset = () => {
    setResults(null)
    setProfessorResults(null)
    setSearchType('course')
    setIsLoading(false)
    setError(null)
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
              results || professorResults ? "max-w-full px-4" : "max-w-2xl"
            }`}
          >
            {!results && !professorResults && !isLoading && <SearchForm onSearch={handleSearch} />}
            {isLoading && sessionId && <RealTimeLoadingSteps sessionId={sessionId} searchType={searchType} />}
            
            {/* Course Results */}
            {results && results.structured_data && (
              <StructuredResultsDisplay results={results} onReset={() => { setResults(null); setProfessorResults(null) }} />
            )}
            {results && !results.structured_data && (
              <ResultsDisplay results={results} onReset={() => { setResults(null); setProfessorResults(null) }} />
            )}
            
            {/* Professor Results */}
            {professorResults ? (
              <ProfessorResultsDisplay 
                results={professorResults} 
                onReset={handleReset}
                onCourseSelect={handleCourseSelect}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
