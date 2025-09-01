"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { LiquidGlassContainer } from "@/components/ui/liquid-glass-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star, ExternalLink, Users } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import redditLogo from "@/app/images/redditlogowhite.png"
import googleSheetsLogo from "@/app/images/googlesheetslogo.png"
import rmpLogo from "@/app/images/rmplogo.png"

interface ProfessorResultsDisplayProps {
  results: any
  onReset: () => void
  onCourseSelect?: (professorName: string, courseCode: string) => void
}

// Custom Star Rating Component
const StarRating = ({ rating, maxRating = 5, animate = false }: { rating: number; maxRating?: number; animate?: boolean }) => {
  const safeRating = rating != null ? rating : 0
  const [visibleStars, setVisibleStars] = useState(animate ? 0 : safeRating)
  
  useEffect(() => {
    if (animate) {
      setVisibleStars(0)
      const timer = setTimeout(() => {
        setVisibleStars(safeRating)
      }, 100)
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
          className="h-5 w-5 fill-yellow-400 text-yellow-400 transition-all duration-150 ease-out"
        />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-5 w-5 text-gray-300" />
          <Star 
            className="absolute inset-0 h-5 w-5 fill-yellow-400 text-yellow-400 transition-all duration-150 ease-out"
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          />
        </div>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300 transition-all duration-150 ease-out" />
      ))}
      <span className="ml-2 text-sm text-white/80">
        {rating != null ? rating.toFixed(1) : '0.0'}/{maxRating}
      </span>
    </div>
  )
}

// Source Icon Component
const SourceIcon = ({ source }: { source: string }) => {
  if (source === 'database') {
    return <Image src={googleSheetsLogo} alt="Google Sheets" width={24} height={24} className="object-contain" />
  } else if (source === 'reddit') {
    return <Image src={redditLogo} alt="Reddit" width={24} height={24} className="object-contain" />
  } else if (source === 'rmp') {
    return <Image src={rmpLogo} alt="Rate My Professors" width={32} height={32} className="object-contain" />
  }
  return null
}

// Helper function to format review dates (handles different date formats)
const formatReviewDate = (dateString: string | number) => {
  if (!dateString) return '' // Return empty string instead of 'Unknown'
  
  // If it's a Unix timestamp (number)
  if (typeof dateString === 'number') {
    const date = new Date(dateString * 1000)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
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

// Sentiment Bar Component
const SentimentBar = ({ sentiment }: { sentiment: { positive: number; neutral: number; negative: number } }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/80">Sentiment Distribution</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 flex overflow-hidden">
        <div 
          className="bg-green-400 transition-all duration-1000 ease-out"
          style={{ width: `${sentiment.positive}%` }}
          title={`${sentiment.positive}% Positive`}
        />
        <div 
          className="bg-yellow-400 transition-all duration-1000 ease-out"
          style={{ width: `${sentiment.neutral}%` }}
          title={`${sentiment.neutral}% Neutral`}
        />
        <div 
          className="bg-red-400 transition-all duration-1000 ease-out"
          style={{ width: `${sentiment.negative}%` }}
          title={`${sentiment.negative}% Negative`}
        />
      </div>
      <div className="flex justify-between text-xs text-white/60 mt-1">
        <span>👍 {sentiment.positive}%</span>
        <span>👎 {sentiment.negative}%</span>
      </div>
    </div>
  )
}

// Helper function to generate sentiment-aware summary
const generateSentimentSummary = (
  strengths: string[], 
  weaknesses: string[], 
  sentiment: { positive: number; neutral: number; negative: number }
) => {
  const isPositive = sentiment.positive > 50
  const isNegative = sentiment.negative > 50
  const isBalanced = Math.abs(sentiment.positive - sentiment.negative) <= 20

  if (isPositive) {
    const topStrengths = strengths.slice(0, 2).join(" and ").toLowerCase()
    const minorWeakness = weaknesses[0]?.toLowerCase() || "some minor concerns"
    return `Students generally appreciate this professor, particularly for ${topStrengths}. While some mention ${minorWeakness}, the overall experience tends to be positive.`
  } else if (isNegative) {
    const topWeaknesses = weaknesses.slice(0, 2).join(" and ").toLowerCase()
    const minorStrength = strengths[0]?.toLowerCase() || "some positive aspects"
    return `Students frequently express concerns about ${topWeaknesses}. Although some note ${minorStrength}, the majority of reviews tend to be critical.`
  } else {
    const mainStrength = strengths[0]?.toLowerCase() || "certain teaching aspects"
    const mainWeakness = weaknesses[0]?.toLowerCase() || "some areas for improvement"
    return `Student opinions are mixed about this professor, with many appreciating ${mainStrength}. However, there are also common concerns about ${mainWeakness}.`
  }
}

export function ProfessorResultsDisplay({ results, onReset, onCourseSelect }: ProfessorResultsDisplayProps) {
  if (!results || !results.success) {
    // Check for specific error types
    const errorType = (results as any)?.error
    const professor = (results as any)?.professor_name || "this professor"
    const course = (results as any)?.course_filter || ""
    
    if (errorType === "professor_not_found") {
      return (
        <div className="w-full space-y-6">
          <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Professor Not Found</h2>
            <p className="text-white/70 mb-4 leading-relaxed">
              {(results as any)?.message || `Professor '${professor}' not found in Rate My Professors.`}
            </p>
            {(results as any)?.suggestion && (
              <p className="text-blue-300 text-sm">
                {(results as any).suggestion}
              </p>
            )}
          </LiquidGlassContainer>
        </div>
      )
    }
    
    if (errorType === "course_not_reviewed") {
      const availableCourses = (results as any)?.available_courses || []
      const professorName = (results as any)?.professor_name || ""
      
      return (
        <div className="w-full space-y-6">
          <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Course Not Found</h2>
            <p className="text-white/70 mb-4 leading-relaxed">
              {(results as any)?.message || "No reviews found for this course."}
            </p>
            
            {availableCourses.length > 0 && (
              <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h3 className="text-blue-300 font-semibold mb-3">Here are the courses we found with reviews:</h3>
                {(results as any)?.suggestion && (
                  <p className="text-blue-300/80 text-sm mb-4">
                    {(results as any).suggestion}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableCourses.slice(0, 12).map((course: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => onCourseSelect && onCourseSelect(professorName, course)}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100 text-sm rounded border border-blue-500/40 hover:border-blue-400 transition-all duration-200 font-medium"
                    >
                      {course}
                    </button>
                  ))}
                </div>
                {availableCourses.length > 12 && (
                  <p className="text-blue-300/70 text-sm mt-3">
                    +{availableCourses.length - 12} more courses available
                  </p>
                )}
              </div>
            )}
            
            
          </LiquidGlassContainer>
        </div>
      )
    }
    
    if (errorType === "course_not_taught") {
      const suggestedCourses = (results as any)?.suggested_courses || []
      
      return (
        <div className="w-full space-y-6">
          <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Course Not Found</h2>
            <p className="text-white/70 mb-4 leading-relaxed">
              {(results as any)?.message || `Professor ${professor} doesn't appear to teach ${course}.`}
            </p>
            
            {suggestedCourses.length > 0 && (
              <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h3 className="text-blue-300 font-semibold mb-2">Courses this professor teaches:</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedCourses.slice(0, 8).map((course: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-200 text-sm rounded">
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {(results as any)?.suggestion && (
              <p className="text-blue-300 text-sm mt-4">
                {(results as any).suggestion}
              </p>
            )}
          </LiquidGlassContainer>
        </div>
      )
    }
    
    // Check if it's the old "no course data" error
    if (errorType === "no_course_data") {
      return (
        <div className="w-full space-y-6">
          <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">No Reviews Found</h2>
            <p className="text-white/70 mb-4 leading-relaxed">
              {(results as any)?.message || "No reviews found for this professor and course combination."}
            </p>
            {(results as any)?.suggestion && (
              <p className="text-blue-300 text-sm">
                {(results as any).suggestion}
              </p>
            )}
          </LiquidGlassContainer>
        </div>
      )
    }

    // Generic error case
    return (
      <div className="w-full space-y-6">
        <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          New Search
        </Button>
        <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Search Error</h2>
          <p className="text-white/70 mb-4">
            We encountered an issue with your search. Please try again with different search terms.
          </p>
          <p className="text-blue-300 text-sm">
            💡 Double-check the professor name spelling and course code
          </p>
        </LiquidGlassContainer>
      </div>
    )
  }

  if (!results.analysis?.success) {
    return (
      <div className="w-full space-y-6">
        <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          New Search
        </Button>
        <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Analysis Unavailable</h2>
          <p className="text-white/70">We couldn't analyze this professor. Please try a different search.</p>
        </LiquidGlassContainer>
      </div>
    )
  }

  const data = results.analysis.analysis
  const profInfo = data.professor_info

  return (
    <div className="w-full space-y-6">
      <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        New Search
      </Button>



      {/* Professor Header */}
      <LiquidGlassContainer variant="subtle" disableInteractive={true} className="text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-3xl font-bold">
                {profInfo.name || 'Unknown Professor'}
              </h2>
              {profInfo.rmp_link && (
                <a
                  href={profInfo.rmp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-lg font-semibold bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 rounded-lg border border-orange-500/30 transition-all"
                >
                  <ExternalLink className="h-5 w-5" />
                  Rate My Professors
                </a>
              )}
            </div>
            
            <div className="flex items-center gap-6 mb-4">
              <StarRating rating={profInfo.primary_rating || 0} maxRating={profInfo.max_rating || 5} animate={true} />
            </div>

            <SentimentBar sentiment={profInfo.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 }} />
          </div>
        </div>
        
        {/* Data Sources */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
          <span className="flex items-center gap-2">
            <Image src={rmpLogo} alt="Rate My Professors" width={24} height={24} className="object-contain" />
            {results.data_sources.total_rmp_reviews} RMP reviews analyzed
          </span>
          <span className="flex items-center gap-2">
            <Image src={redditLogo} alt="Reddit" width={20} height={20} className="object-contain" />
            {results.data_sources.reddit_posts_analyzed} Reddit posts analyzed
          </span>
          {results.data_sources.ucr_database_included && (
            <span className="flex items-center gap-2">
              <Image src={googleSheetsLogo} alt="Google Sheets" width={20} height={20} className="object-contain" />
              UCR Database analyzed
            </span>
          )}
        </div>
      </LiquidGlassContainer>



      {/* Combined Analysis & Summary */}
      <div className="space-y-6">
        <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Users className="h-6 w-6" />
            Professor Summary & Highlights
          </h3>
          
          {/* Student Feedback Summary */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">Overall Student Opinion</h4>
            <p className="text-white/90 leading-relaxed text-lg bg-white/5 rounded-lg p-4 border border-white/10">
              {generateSentimentSummary(
                data.teaching_analysis?.strengths || [],
                data.teaching_analysis?.weaknesses || [],
                profInfo.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 }
              )}
            </p>
          </div>

          {/* Most Relevant Recent Reviews from All Sources */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Most Relevant Recent Reviews</h4>
            <p className="text-white/60 text-sm mb-4">Top reviews from Rate My Professors, Reddit, and Google Sheets</p>
            <div className="space-y-4">
              {(data.reviews || []).slice(0, 6).map((review: any, idx: number) => (
                <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SourceIcon source={review.source || 'unknown'} />
                      {formatReviewDate(review.date) && (
                        <span className="text-white/70 text-sm">{formatReviewDate(review.date)}</span>
                      )}
                      <span className="text-blue-300 text-sm">{review.course ? review.course.toUpperCase() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating || 0} maxRating={5} />
                    </div>
                  </div>
                  
                  <p className="text-white/90 leading-relaxed mb-2">"{review.text || 'No review text available'}"</p>
                  
                  {review.tags && Array.isArray(review.tags) && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.tags.map((tag: any, tagIdx: number) => (
                        <span key={tagIdx} className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">
                          {tag || 'N/A'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </LiquidGlassContainer>


      </div>
    </div>
  )
}

 