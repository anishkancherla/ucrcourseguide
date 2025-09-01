"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { LiquidGlassContainer } from "@/components/ui/liquid-glass-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star, BarChart2, Users, Lightbulb, AlertTriangle, FileText, MessageCircle, Database, LinkIcon } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import redditLogo from "@/app/images/redditlogo.png"
import googleSheetsLogo from "@/app/images/googlesheetslogo.png"
import redditLogoWhite from "@/app/images/redditlogowhite.png"
import rmpLogo from "@/app/images/rmplogo.png"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'

interface StructuredResultsDisplayProps {
  results: {
    summary: string
    links: { title: string; url: string; score?: number; comments?: number }[]
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
        rmp_overall_rating?: number
        rmp_link?: string
        department?: string
        sentiment_distribution?: {
          positive: number
          neutral: number
          negative: number
        }
        total_reviews_analyzed?: number
        reviews: Array<{
          source: string
          date: string
          text: string
          rating?: number
          class?: string
          grade?: string
          difficulty?: number
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
      ucr_database_included?: boolean
      rmp_enabled?: boolean
      rmp_professors_count?: number
      total_rmp_reviews?: number
    }
    raw_data?: {
      course: string
      posts: Array<{
        post: {
          title: string
          url: string
          score: number
          num_comments: number
          selftext?: string
        }
        comments: Array<{
          body: string
          score: number
        }>
      }>
      ucr_database: string
    }
    keyword?: string
  } | null
  onReset: () => void
}

// Custom Star Rating Component
const StarRating = ({ rating, maxRating = 5, animate = false }: { rating: number; maxRating?: number; animate?: boolean }) => {
  const safeRating = rating != null ? rating : 0
  const [visibleStars, setVisibleStars] = useState(animate ? 0 : safeRating)
  
  useEffect(() => {
    if (animate) {
      // Start with 0 stars visible
      setVisibleStars(0)
      
      // Animate stars filling in one by one
              const totalStars = Math.ceil(safeRating) // Number of stars to fill (including partial)
      let currentStar = 0
      
      const fillStars = () => {
        if (currentStar < totalStars) {
          currentStar += 0.1 // Very small increments for ultra-smooth animation
          const nextValue = Math.min(currentStar, safeRating)
          setVisibleStars(nextValue)
          
          // Continue animation with very short interval
          setTimeout(fillStars, 30) // 30ms between each increment for fast, fluid motion
        }
      }
      
      // Start animation immediately
      const timer = setTimeout(fillStars, 50)
      return () => clearTimeout(timer)
    } else {
      setVisibleStars(safeRating)
    }
  }, [safeRating, animate])

  const fullStars = Math.floor(visibleStars)
  const hasHalfStar = visibleStars % 1 >= 0.5
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star 
          key={`full-${i}`} 
          className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-150 ease-out transform"
        />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <Star 
            className="absolute inset-0 h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-150 ease-out"
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          />
        </div>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300 transition-all duration-150 ease-out" />
      ))}
      <span className="ml-2 text-sm text-white/80">
        {rating != null ? rating.toFixed(1) : '0.0'}/{maxRating}
      </span>
    </div>
  )
}

// Difficulty Progress Bar
const DifficultyBar = ({ rating, maxRating = 10 }: { rating: number; maxRating?: number }) => {
  const [animatedWidth, setAnimatedWidth] = useState(0)
  const targetPercentage = (rating / maxRating) * 100
  
  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setAnimatedWidth(targetPercentage)
    }, 100) // Small delay to ensure smooth animation start
    
    return () => clearTimeout(timer)
  }, [targetPercentage])
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/80">Difficulty Rating</span>
        <span className="text-sm text-white/80">{rating}/{maxRating}</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-green-400 to-red-400 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  )
}

// Source Icon Component
const SourceIcon = ({ source }: { source: string }) => {
  if (source === 'database') {
    return <Image src={googleSheetsLogo} alt="Google Sheets" width={16} height={16} className="object-contain" />
  }
  if (source === 'rmp') {
    return <Image src={rmpLogo} alt="RMP" width={16} height={16} className="object-contain" />
  }
  return <Image src={redditLogo} alt="Reddit" width={16} height={16} className="object-contain" />
}

// Sentiment Distribution Bar Component
const SentimentDistributionBar = ({ distribution }: { distribution: { positive: number; neutral: number; negative: number } }) => {
  const total = distribution.positive + distribution.neutral + distribution.negative
  const positivePercent = (distribution.positive / total) * 100
  const neutralPercent = (distribution.neutral / total) * 100
  const negativePercent = (distribution.negative / total) * 100
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/60">Review Sentiment</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">+{distribution.positive}</span>
          <span className="text-gray-400">•{distribution.neutral}</span>
          <span className="text-red-400">-{distribution.negative}</span>
        </div>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2 flex overflow-hidden">
        <div 
          className="bg-green-400 transition-all duration-1000 ease-out"
          style={{ width: `${positivePercent}%` }}
        />
        <div 
          className="bg-gray-400 transition-all duration-1000 ease-out"
          style={{ width: `${neutralPercent}%` }}
        />
        <div 
          className="bg-red-400 transition-all duration-1000 ease-out"
          style={{ width: `${negativePercent}%` }}
        />
      </div>
    </div>
  )
}

// Enhanced Professor Card Component with RMP Integration
const ProfessorCard = ({ professor, animate }: { professor: any; animate: boolean }) => {
  const [showAllReviews, setShowAllReviews] = useState(false)
  
  // Helper function to get rating color based on value
  const getRatingColor = (rating: number) => {
    if (rating >= 4.0) return 'text-green-400'
    if (rating >= 3.0) return 'text-yellow-400'
    if (rating >= 2.0) return 'text-orange-400'
    return 'text-red-400'
  }
  
  // Helper function to get review sentiment color
  const getReviewSentimentColor = (rating: number) => {
    if (rating >= 4) return 'border-l-green-400 bg-green-500/5'
    if (rating >= 3) return 'border-l-yellow-400 bg-yellow-500/5'
    if (rating >= 2) return 'border-l-orange-400 bg-orange-500/5'
    return 'border-l-red-400 bg-red-500/5'
  }
  
  // Show first 3 reviews by default, all when expanded
  const reviewsToShow = showAllReviews ? professor.reviews : professor.reviews?.slice(0, 3)
  const hasMoreReviews = professor.reviews && professor.reviews.length > 3
  
  return (
    <LiquidGlassContainer variant="subtle" disableInteractive={true} className="p-4">
      {/* Professor Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-white">{professor.name}</h4>
          {professor.department && (
            <p className="text-xs text-white/60">{professor.department}</p>
          )}
        </div>
        <div className="text-right">
          <StarRating rating={professor.rating} maxRating={professor.max_rating} animate={animate} />
          {professor.rmp_overall_rating && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/60">RMP:</span>
              <span className={`text-sm font-medium ${getRatingColor(professor.rmp_overall_rating)}`}>
                {professor.rmp_overall_rating.toFixed(1)}/5.0
              </span>
              {professor.rmp_link && (
                <a 
                  href={professor.rmp_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <LinkIcon className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Sentiment Distribution (if available) */}
      {professor.sentiment_distribution && (
        <div className="mb-4">
          <SentimentDistributionBar distribution={professor.sentiment_distribution} />
        </div>
      )}
      
      {/* Review Count */}
      {professor.total_reviews_analyzed && (
        <div className="mb-3">
          <span className="text-xs text-white/60">
            Based on {professor.total_reviews_analyzed} reviews across all sources
          </span>
        </div>
      )}
      
      {/* Reviews Section */}
      <div className="space-y-2">
        {reviewsToShow?.map((review: any, idx: number) => (
          <div 
            key={idx} 
            className={`text-sm text-white/80 p-3 rounded-lg border-l-4 transition-all hover:bg-white/5 ${
              review.rating ? getReviewSentimentColor(review.rating) : 'border-l-gray-400 bg-gray-500/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SourceIcon source={review.source} />
                {formatReviewDate(review.date) && (
                  <span className="text-xs text-white/60">{formatReviewDate(review.date)}</span>
                )}
                {review.class && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                    {review.class}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {review.rating && (
                  <span className={`text-xs font-medium ${getRatingColor(review.rating)}`}>
                    {review.rating}/5
                  </span>
                )}
                {review.grade && (
                  <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">
                    Grade: {review.grade}
                  </span>
                )}
              </div>
            </div>
            <p className="leading-relaxed">"{review.text}"</p>
            {review.difficulty && (
              <div className="mt-2 text-xs text-white/60">
                Difficulty: {review.difficulty}/5
              </div>
            )}
          </div>
        ))}
        
        {/* Show More/Less Button */}
        {hasMoreReviews && (
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="w-full mt-2 text-xs text-blue-300 hover:text-blue-200 transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
          >
            {showAllReviews ? 'Show Less Reviews' : `Show ${professor.reviews.length - 3} More Reviews`}
          </button>
        )}
        
        {/* Minority Opinions */}
        {professor.minority_opinions && professor.minority_opinions.length > 0 && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-xs text-orange-300 font-medium mb-2">💭 Alternative Perspectives:</p>
            {professor.minority_opinions.map((opinion: string, idx: number) => (
              <p key={idx} className="text-xs text-white/70 mb-1">• {opinion}</p>
            ))}
          </div>
        )}
      </div>
    </LiquidGlassContainer>
  )
}

// Mobile Review Card Component with Expandable Comments
const MobileReviewCard = ({ review, idx }: { review: any; idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = review.comments.length > 150
  const displayComment = isExpanded ? review.comments : review.comments.slice(0, 150) + (shouldTruncate ? '...' : '')

  return (
    <div 
      className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
        idx % 2 === 0 ? 'bg-white/2' : 'bg-transparent'
      }`}
    >
      {/* Header with review number, date, and difficulty */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm font-mono">
            #{review.reviewNumber.replace('Review ', '')}
          </span>
          <span className="text-white/80 text-sm">
            {review.date}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          review.difficulty.includes('/10') 
            ? parseInt(review.difficulty) <= 3 
              ? 'bg-green-500/20 text-green-300' 
              : parseInt(review.difficulty) <= 6 
              ? 'bg-yellow-500/20 text-yellow-300'
              : 'bg-red-500/20 text-red-300'
            : 'bg-gray-500/20 text-gray-300'
        }`}>
          {review.difficulty}
        </span>
      </div>
      
      {/* Comment section */}
      <div className="text-white/90 text-sm leading-relaxed">
        <p>{displayComment}</p>
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-blue-300 hover:text-blue-200 text-xs font-medium transition-colors"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    </div>
  )
}

// Helper function to convert Unix timestamp to readable date
const formatPostDate = (created_utc: number) => {
  if (!created_utc) return '' // Return empty string instead of 'Unknown date'
  const date = new Date(created_utc * 1000)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Helper function to format review dates (handles different date formats)
const formatReviewDate = (dateString: string | number) => {
  if (!dateString) return '' // Return empty string instead of 'Unknown'
  
  // If it's a Unix timestamp (number)
  if (typeof dateString === 'number') {
    return formatPostDate(dateString)
  }
  
  // If it's already a formatted date string, return as is
  if (typeof dateString === 'string') {
    // Check if it's a valid date string
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }
  
  return '' // Return empty string for invalid dates
}

// Helper function to get days since post was created
const getDaysSincePost = (created_utc: number) => {
  if (!created_utc) return 99999
  const postDate = new Date(created_utc * 1000)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - postDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Helper function to categorize post content and get appropriate icon
const categorizePostContent = (post: any, comments: any[]) => {
  const allText = `${post.title} ${post.selftext || ''} ${comments.map((c: any) => c.body).join(' ')}`.toLowerCase()
  const categories = []
  
  // Difficulty category
  if (/\b(difficult|hard|easy|challenging|tough|simple)\b/.test(allText)) {
    categories.push({ type: 'difficulty', icon: '📊', label: 'Difficulty' })
  }
  
  // Professor/Teaching category
  if (/\b(professor|prof|teacher|instructor|lecture|teaching)\b/.test(allText)) {
    categories.push({ type: 'professor', icon: '👨‍🏫', label: 'Professor' })
  }
  
  // Exam/Assessment category
  if (/\b(exam|test|midterm|final|quiz|assessment|grade)\b/.test(allText)) {
    categories.push({ type: 'exam', icon: '📝', label: 'Exams' })
  }
  
  // Tips/Advice category
  if (/\b(tip|advice|recommend|suggest|help|study|prepare)\b/.test(allText)) {
    categories.push({ type: 'advice', icon: '💡', label: 'Tips' })
  }
  
  // Workload category
  if (/\b(homework|assignment|workload|time|hour|project|work)\b/.test(allText)) {
    categories.push({ type: 'workload', icon: '⏰', label: 'Workload' })
  }
  
  // General experience category
  if (/\b(experience|took|taking|overall|worth|enjoyed)\b/.test(allText)) {
    categories.push({ type: 'experience', icon: '🎓', label: 'Experience' })
  }
  
  return categories.length > 0 ? categories : [{ type: 'general', icon: '💬', label: 'Discussion' }]
}

// Function to prioritize and sort Reddit posts (backend already filtered for main topic)
const prioritizeRelevantPosts = (posts: any[]) => {
  if (!posts) return []
  
  return posts
    .map(postData => {
      const post = postData.post
      const comments = postData.comments || []
      
      // Calculate relevance score
      let relevanceScore = 0
      
      // PRIORITIZE RECENT POSTS - This is the most important factor
      const daysSince = getDaysSincePost(post.created_utc)
      if (daysSince <= 30) relevanceScore += 50  // Very recent posts get huge boost
      else if (daysSince <= 90) relevanceScore += 30  // Recent posts get good boost
      else if (daysSince <= 180) relevanceScore += 15  // Semi-recent posts get some boost
      else if (daysSince <= 365) relevanceScore += 5   // Posts from this year get small boost
      // Posts older than 1 year get no date bonus
      
      // Check title for course-relevant keywords
      const titleLower = post.title.toLowerCase()
      const relevantKeywords = ['professor', 'prof', 'class', 'course', 'exam', 'midterm', 'final', 'grade', 'difficulty', 'easy', 'hard', 'tips', 'advice', 'review', 'experience', 'take', 'recommend']
      relevanceScore += relevantKeywords.filter(keyword => titleLower.includes(keyword)).length * 2
      
      // Check post content for useful information
      if (post.selftext) {
        const textLower = post.selftext.toLowerCase()
        relevanceScore += relevantKeywords.filter(keyword => textLower.includes(keyword)).length
        
        // Boost for longer, more detailed posts
        if (post.selftext.length > 100) relevanceScore += 3
        if (post.selftext.length > 300) relevanceScore += 5
      }
      
      // Boost for posts with comments (indicates engagement)
      relevanceScore += Math.min(comments.length * 2, 10)
      
      // Boost for upvoted posts
      relevanceScore += Math.min(post.score, 20)
      
      // Check comments for useful content
      const usefulComments = comments.filter((comment: any) => {
        const commentLower = comment.body.toLowerCase()
        return relevantKeywords.some(keyword => commentLower.includes(keyword)) && comment.body.length > 20
      })
      relevanceScore += usefulComments.length * 3
      
      // Get content categories for this post
      const categories = categorizePostContent(post, comments)
      
      return {
        ...postData,
        relevanceScore,
        usefulComments: usefulComments.length,
        categories,
        formattedDate: formatPostDate(post.created_utc),
        daysSince
      }
    })
    .filter(post => post.relevanceScore > 5) // Only include posts with decent relevance
    .sort((a, b) => {
      // Primary sort: relevance score (which now heavily weights recent posts)
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      // Secondary sort: date (newer first)
      return a.daysSince - b.daysSince
    })
    .slice(0, 20) // Top 20 most relevant posts for comprehensive analysis
}

// Add this helper function before the main component
const parseUCRDatabaseData = (rawData: string) => {
  const lines = rawData.split('\n').filter(line => line.trim())
  const result = {
    courseCode: '',
    overallDifficulty: '',
    reviews: [] as Array<{
      reviewNumber: string
      date: string
      difficulty: string
      comments: string
    }>
  }

  let currentReview: any = {}
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine.includes('UCR Class Difficulty Database -')) {
      result.courseCode = trimmedLine.split('- ')[1] || ''
    } else if (trimmedLine.includes('Overall Average Difficulty:')) {
      result.overallDifficulty = trimmedLine.split(': ')[1] || ''
    } else if (trimmedLine.startsWith('Review ') && trimmedLine.includes(':')) {
      // Save previous review if exists
      if (currentReview.reviewNumber) {
        result.reviews.push({ ...currentReview })
      }
      // Start new review
      currentReview = {
        reviewNumber: trimmedLine.replace(':', ''),
        date: '',
        difficulty: '',
        comments: ''
      }
    } else if (trimmedLine.startsWith('Date:')) {
      currentReview.date = trimmedLine.replace('Date: ', '')
    } else if (trimmedLine.startsWith('Individual Difficulty:')) {
      currentReview.difficulty = trimmedLine.replace('Individual Difficulty: ', '')
    } else if (trimmedLine.startsWith('Comments:')) {
      currentReview.comments = trimmedLine.replace('Comments: ', '')
    }
  }
  
  // Don't forget the last review
  if (currentReview.reviewNumber) {
    result.reviews.push(currentReview)
  }
  
  // Sort reviews by date (most recent first)
  result.reviews.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateB.getTime() - dateA.getTime()
  })
  
  return result
}



export function StructuredResultsDisplay({ results, onReset }: StructuredResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("sentiment")
  // Animation states for workload cards
  const [animateWorkload, setAnimateWorkload] = useState(false)
  // Animation state for professor stars
  const [animateProfessors, setAnimateProfessors] = useState(false)

  // Animation state for advice section
  const [animateAdvice, setAnimateAdvice] = useState(false)

  // Check if Reddit data exists and has content
  const hasRedditData = results?.raw_data?.posts && results.raw_data.posts.length > 0
  const hasDatabaseData = results?.raw_data?.ucr_database

  // Reset and trigger animations when sentiment tab becomes active
  useEffect(() => {
    if (activeTab === "sentiment") {
      setAnimateWorkload(false)
      // Small delay to ensure reset, then trigger animation
      const timer = setTimeout(() => {
        setAnimateWorkload(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setAnimateWorkload(false)
    }
  }, [activeTab])

  // Reset and trigger animations when professors tab becomes active
  useEffect(() => {
    if (activeTab === "professors") {
      setAnimateProfessors(false)
      // Small delay to ensure reset, then trigger animation
      const timer = setTimeout(() => {
        setAnimateProfessors(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setAnimateProfessors(false)
    }
  }, [activeTab])

  // Reset and trigger animations when grades tab becomes active


  // Reset and trigger animations when advice tab becomes active
  useEffect(() => {
    if (activeTab === "advice") {
      setAnimateAdvice(false)
      // Small delay to ensure reset, then trigger animation
      const timer = setTimeout(() => {
        setAnimateAdvice(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setAnimateAdvice(false)
    }
  }, [activeTab])

  if (!results || !results.structured_data) return null

  const data = results.structured_data

  const tabs = [
    { id: "sentiment", label: "Overall Sentiment", icon: Star },
    { id: "difficulty", label: "Difficulty", icon: BarChart2 },
    { id: "professors", label: "Professors", icon: Users },
    { id: "advice", label: "Tips", icon: Lightbulb },
    { id: "reddit", label: "Relevant Reddit Posts", icon: MessageCircle },
    { id: "database", label: "UCR Class Difficulty Database Info", icon: Database },
  ]

  return (
    <div className="w-full space-y-6">
      <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        New Search
      </Button>

      {/* Course Header */}
      <LiquidGlassContainer variant="subtle" disableInteractive={true} className="text-white p-6">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            {results.keyword?.toUpperCase()}
          </h2>
          <div className="text-sm text-white/60 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            {results.analysis_metadata?.total_posts_analyzed !== undefined && (
              <span className="flex items-center gap-2">
                <Image src={redditLogoWhite} alt="Reddit" width={20} height={20} className="object-contain" />
                {results.analysis_metadata.total_posts_analyzed > 0 ? (
                  <>
                    {results.analysis_metadata.total_posts_analyzed} Reddit posts
                    {results.analysis_metadata?.total_comments_analyzed && 
                      ` and ${results.analysis_metadata.total_comments_analyzed} comments`
                    } analyzed
                  </>
                                 ) : (
                   "No relevant reddit posts found"
                 )}
              </span>
            )}
            {results.analysis_metadata?.ucr_database_included && (
              <span className="flex items-center gap-2">
                <Image src={googleSheetsLogo} alt="Google Sheets" width={16} height={16} className="object-contain" />
                UCR Database analyzed
              </span>
            )}
            {results.analysis_metadata?.rmp_enabled && results.analysis_metadata?.rmp_professors_count && results.analysis_metadata.rmp_professors_count > 0 && (
              <span className="flex items-center gap-2">
                <Image src={rmpLogo} alt="Rate My Professors" width={16} height={16} className="object-contain" />
                {results.analysis_metadata.rmp_professors_count} professors
                {results.analysis_metadata?.total_rmp_reviews && 
                  ` and ${results.analysis_metadata.total_rmp_reviews} RMP reviews`
                } analyzed
              </span>
            )}
          </div>
        </div>
      </LiquidGlassContainer>

      {/* Tab Navigation */}
      <LiquidGlassContainer variant="subtle" className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isDatabase = tab.id === "database"
            const isReddit = tab.id === "reddit"
            const isActive = activeTab === tab.id
            
            // Check if tab has data
            const hasData = tab.id === "reddit" ? hasRedditData : 
                           tab.id === "database" ? hasDatabaseData : 
                           true // Other tabs always have data if we reach this point
            
            return (
              <LiquidGlassButton
                key={tab.id}
                onClick={() => hasData && setActiveTab(tab.id)}
                disabled={!hasData}
                glassIntensity={isActive ? 0.3 : hasData ? 0.15 : 0.05}
                className={`flex items-center px-4 py-2 text-sm font-medium transition-all ${
                  !hasData
                    ? "bg-white/3 text-black/30 md:text-white/30 cursor-not-allowed border-white/10"
                    : isActive
                    ? isDatabase
                      ? "bg-[#0B6B3A]/80 text-white shadow-lg border-[#0B6B3A]/50"
                      : isReddit
                      ? "bg-[#CC4125]/80 text-white shadow-lg border-[#CC4125]/50"
                      : "bg-white/15 text-black md:text-white shadow-lg border-white/40"
                    : "bg-white/5 text-black/70 md:text-white/70 hover:text-black md:hover:text-white hover:bg-white/10 border-white/20"
                }`}
              >
                {isReddit ? (
                  <Image 
                    src={redditLogo} 
                    alt="Reddit" 
                    width={20} 
                    height={20} 
                    className={`mr-2 object-contain ${!hasData ? 'opacity-30' : ''}`} 
                  />
                ) : isDatabase ? (
                  <Image 
                    src={googleSheetsLogo} 
                    alt="Google Sheets" 
                    width={16} 
                    height={16} 
                    className={`mr-2 object-contain ${!hasData ? 'opacity-30' : ''}`} 
                  />
                ) : (
                  <Icon className={`mr-2 h-4 w-4 ${!hasData ? 'opacity-30' : ''} text-black md:text-white`} />
                )}
                {tab.label}
                {!hasData && <span className="ml-2 text-xs opacity-60">(No data)</span>}
              </LiquidGlassButton>
            )
          })}
        </div>
      </LiquidGlassContainer>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overall Sentiment Tab */}
        {activeTab === "sentiment" && data.overall_sentiment && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Overall Sentiment</h3>
            <p className="text-white/90 mb-4 text-lg">{data.overall_sentiment.summary}</p>
            
            {data.overall_sentiment.workload && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white">Workload & Time Commitment</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className={`bg-white/5 p-3 rounded hover:bg-white/10 transition-all duration-300 ${
                    animateWorkload 
                      ? 'translate-x-0 opacity-100' 
                      : '-translate-x-4 opacity-0'
                  } transition-all duration-700 delay-500`}>
                    <p className="text-sm text-white/70">Hours per week</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.hours_per_week}</p>
                  </div>
                  <div className={`bg-white/5 p-3 rounded hover:bg-white/10 transition-all duration-300 ${
                    animateWorkload 
                      ? 'translate-x-0 opacity-100' 
                      : '-translate-x-4 opacity-0'
                  } transition-all duration-700 delay-600`}>
                    <p className="text-sm text-white/70">Assignments</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.assignments}</p>
                  </div>
                  <div className={`bg-white/5 p-3 rounded hover:bg-white/10 transition-all duration-300 ${
                    animateWorkload 
                      ? 'translate-x-0 opacity-100' 
                      : '-translate-x-4 opacity-0'
                  } transition-all duration-700 delay-700`}>
                    <p className="text-sm text-white/70">Time commitment</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.time_commitment}</p>
                  </div>
                </div>
              </div>
            )}
          </LiquidGlassContainer>
        )}

        {/* Difficulty Tab */}
        {activeTab === "difficulty" && data.difficulty && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Difficulty</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Rank: {data.difficulty.rank}</h4>
                <DifficultyBar rating={data.difficulty.rating} maxRating={data.difficulty.max_rating} />
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Why students say this:</h4>
                <ul className="space-y-2">
                  {data.difficulty.explanation?.map((point, idx) => (
                    <li key={idx} className="text-white/80 flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </LiquidGlassContainer>
        )}

        {/* Professors Tab */}
        {activeTab === "professors" && data.professors && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Frequent Instructors & Student Reviews</h3>
            <div className="grid gap-4">
              {data.professors
                .sort((a, b) => b.rating - a.rating) // Sort by rating, highest first
                .map((professor, idx) => (
                <ProfessorCard key={idx} professor={professor} animate={animateProfessors} />
              ))}
            </div>
          </LiquidGlassContainer>
        )}

        {/* Advice & Tips Tab (with Pitfalls) */}
        {activeTab === "advice" && (data.advice || data.common_pitfalls) && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                Advice & Tips
              </h3>
              <p className="text-white/60">Tips, resources, and things to avoid</p>
            </div>
            
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Course-Specific Tips */}
              {data.advice && data.advice.course_specific_tips && data.advice.course_specific_tips.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-white">Course-Specific Tips</h4>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {data.advice.course_specific_tips.map((tip, idx) => (
                      <div 
                        key={idx} 
                        className={`group bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-500/20 rounded-xl p-4 hover:from-slate-500/15 hover:to-slate-600/15 transition-all duration-300 ${
                          animateAdvice 
                            ? 'translate-x-0 opacity-100' 
                            : '-translate-x-4 opacity-0'
                        }`}
                        style={{ transitionDelay: `${idx * 100}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-slate-500/20 text-slate-300 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-slate-500/30 transition-colors">
                            {idx + 1}
                          </div>
                          <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors">
                            {tip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommended Resources */}
              {data.advice && data.advice.resources && data.advice.resources.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-white">Recommended Resources</h4>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {data.advice.resources.map((resource, idx) => (
                      <div 
                        key={idx} 
                        className={`group bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-xl p-4 hover:from-gray-500/15 hover:to-gray-600/15 transition-all duration-300 ${
                          animateAdvice 
                            ? 'translate-x-0 opacity-100' 
                            : '-translate-x-4 opacity-0'
                        }`}
                        style={{ transitionDelay: `${idx * 100}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-gray-500/20 text-gray-300 rounded-full w-8 h-8 flex items-center justify-center shrink-0 group-hover:bg-gray-500/30 transition-colors">
                          </div>
                          <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors">
                            {resource}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Common Pitfalls Section */}
            {data.common_pitfalls && data.common_pitfalls.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-white">Common Pitfalls to Avoid</h4>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {data.common_pitfalls.map((pitfall, idx) => (
                    <div 
                      key={idx} 
                      className={`group relative bg-gradient-to-r from-zinc-500/10 to-zinc-600/10 border border-zinc-500/20 rounded-xl p-5 hover:from-zinc-500/15 hover:to-zinc-600/15 transition-all duration-300 ${
                        animateAdvice 
                          ? 'translate-y-0 opacity-100' 
                          : 'translate-y-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${idx * 150}ms` }}
                    >
                      {/* Animated warning pulse */}
                      <div className="absolute -top-2 -right-2 bg-zinc-500 rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="bg-zinc-500/20 text-zinc-300 rounded-full w-10 h-10 flex items-center justify-center text-lg shrink-0 group-hover:bg-zinc-500/30 transition-colors">
                        </div>
                        <div className="flex-1">
                          <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors font-medium">
                            {pitfall}
                          </p>
                        </div>
                      </div>
                      
                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-zinc-500/5 to-zinc-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </LiquidGlassContainer>
        )}



        {/* Reddit Posts Tab */}
        {activeTab === "reddit" && hasRedditData && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Relevant Reddit Posts</h3>
            <p className="text-white/70 text-sm mb-6">
              Curated posts with this course as the primary subject, sorted by recency and student engagement
            </p>
            <div className="space-y-4">
              {results.raw_data?.posts ? prioritizeRelevantPosts(results.raw_data.posts).map((postData: any, idx: number) => (
                <LiquidGlassContainer key={idx} variant="subtle" disableInteractive={true} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-medium text-lg flex-1 pr-4">
                      <a 
                        href={postData.post.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-300 transition-colors"
                      >
                        {postData.post.title}
                      </a>
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-white/60 shrink-0">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {postData.post.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {postData.post.num_comments}
                      </span>
                    </div>
                  </div>
                  
                  {/* Post Date and Categories */}
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-xs text-white/60 flex items-center gap-1">
                      {postData.formattedDate}
                      {postData.daysSince <= 30 && (
                        <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs ml-2">
                          Recent
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {postData.categories.map((category: any, catIdx: number) => (
                        <span 
                          key={catIdx}
                          className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded flex items-center gap-1"
                        >
                          {category.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {postData.post.selftext && (
                    <div className="text-white/80 text-sm mb-3 p-3 bg-white/5 rounded">
                      <p className="line-clamp-3">{postData.post.selftext}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">
                      {postData.usefulComments} useful comments
                    </span>
                    <a
                      href={postData.post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 text-sm flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      View on Reddit
                    </a>
                  </div>
                </LiquidGlassContainer>
              )) : null}
            </div>
          </LiquidGlassContainer>
        )}

        {/* Reddit Empty State */}
        {activeTab === "reddit" && !hasRedditData && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <div className="text-center py-12">
              <MessageCircle className="h-16 w-16 text-white/30 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">No Reddit Discussions Found</h3>
              <p className="text-white/60 mb-4">
                We couldn't find any relevant discussions about this course on r/UCR.
              </p>
              <p className="text-white/40 text-sm">
                This could mean the course is new, rarely discussed, or uses a different naming convention.
              </p>
            </div>
          </LiquidGlassContainer>
        )}

        {/* Database Tab */}
        {activeTab === "database" && hasDatabaseData && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">UCR Class Difficulty Database</h3>
            <p className="text-white/70 text-sm mb-6">
              Student reviews from the{' '}
              <a 
                href="https://docs.google.com/spreadsheets/d/1qiy_Oi8aFiPmL4QSTR3zHe74kmvc6e_159L1mAUUlU0/edit?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                UCR class difficulty spreadsheet
              </a>
            </p>
            
            {(() => {
              const parsedData = parseUCRDatabaseData(results.raw_data?.ucr_database || '')
              
              return (
                <div className="space-y-6">
                  {/* Course Header */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold text-white">{parsedData.courseCode}</h4>
                        <p className="text-white/70">Course Analysis</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/60">Overall Average Difficulty</p>
                        <p className={`text-3xl font-bold ${
                          parsedData.overallDifficulty.includes('/10')
                            ? parseFloat(parsedData.overallDifficulty) <= 3
                              ? 'text-green-300'
                              : parseFloat(parsedData.overallDifficulty) <= 6
                              ? 'text-yellow-300'
                              : 'text-red-300'
                            : 'text-orange-300'
                        }`}>
                          {parsedData.overallDifficulty}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reviews Table */}
                  <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      {/* Table Header */}
                      <div className="bg-white/10 border-b border-white/10 p-4">
                        <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-white">
                          <div className="col-span-1">#</div>
                          <div className="col-span-2">Date</div>
                          <div className="col-span-2">Difficulty</div>
                          <div className="col-span-7">Student Comments</div>
                        </div>
                      </div>
                      
                      {/* Table Body */}
                      <div className="max-h-96 overflow-y-auto">
                        {parsedData.reviews.map((review, idx) => (
                          <div 
                            key={idx} 
                            className={`grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                              idx % 2 === 0 ? 'bg-white/2' : 'bg-transparent'
                            }`}
                          >
                            <div className="col-span-1 text-white/60 text-sm font-mono">
                              {review.reviewNumber.replace('Review ', '')}
                            </div>
                            <div className="col-span-2 text-white/80 text-sm">
                              {review.date}
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  review.difficulty.includes('/10') 
                                    ? parseInt(review.difficulty) <= 3 
                                      ? 'bg-green-500/20 text-green-300' 
                                      : parseInt(review.difficulty) <= 6 
                                      ? 'bg-yellow-500/20 text-yellow-300'
                                      : 'bg-red-500/20 text-red-300'
                                    : 'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {review.difficulty}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-7 text-white/90 text-sm leading-relaxed">
                              {review.comments}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden max-h-96 overflow-y-auto">
                      {parsedData.reviews.map((review, idx) => (
                        <MobileReviewCard key={idx} review={review} idx={idx} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-300">{parsedData.reviews.length}</p>
                      <p className="text-white/60 text-sm">Total Reviews</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-300">
                        {parsedData.reviews.filter(r => r.difficulty.includes('/10') && parseInt(r.difficulty) <= 3).length}
                      </p>
                      <p className="text-white/60 text-sm">Easy (1-3/10)</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-300">
                        {parsedData.reviews.filter(r => r.difficulty.includes('/10') && parseInt(r.difficulty) >= 4 && parseInt(r.difficulty) <= 6).length}
                      </p>
                      <p className="text-white/60 text-sm">Moderate (4-6/10)</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-300">
                        {parsedData.reviews.filter(r => r.difficulty.includes('/10') && parseInt(r.difficulty) >= 7).length}
                      </p>
                      <p className="text-white/60 text-sm">Hard (7-10/10)</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </LiquidGlassContainer>
        )}

        {/* Database Empty State */}
        {activeTab === "database" && !hasDatabaseData && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <div className="text-center py-12">
              <Database className="h-16 w-16 text-white/30 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">No Database Information Found</h3>
              <p className="text-white/60 mb-4">
                This course was not found in the UCR class difficulty database.
              </p>
              <p className="text-white/40 text-sm">
                The course might be new, have a different code, or not be included in the community spreadsheet yet.
              </p>
            </div>
          </LiquidGlassContainer>
        )}
      </div>
    </div>
  )
} 