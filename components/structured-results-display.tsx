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
      ucr_database_included?: boolean
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
  const [visibleStars, setVisibleStars] = useState(animate ? 0 : rating)
  
  useEffect(() => {
    if (animate) {
      // Start with 0 stars visible
      setVisibleStars(0)
      
      // Animate stars filling in one by one
      const totalStars = Math.ceil(rating) // Number of stars to fill (including partial)
      let currentStar = 0
      
      const fillStars = () => {
        if (currentStar < totalStars) {
          currentStar += 0.1 // Very small increments for ultra-smooth animation
          const nextValue = Math.min(currentStar, rating)
          setVisibleStars(nextValue)
          
          // Continue animation with very short interval
          setTimeout(fillStars, 30) // 30ms between each increment for fast, fluid motion
        }
      }
      
      // Start animation immediately
      const timer = setTimeout(fillStars, 50)
      return () => clearTimeout(timer)
    } else {
      setVisibleStars(rating)
    }
  }, [rating, animate])

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
        {rating.toFixed(1)}/{maxRating}
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
  return <Image src={redditLogo} alt="Reddit" width={16} height={16} className="object-contain" />
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

// Professor Card Component
const ProfessorCard = ({ professor, animate }: { professor: any; animate: boolean }) => {
  return (
    <LiquidGlassContainer variant="subtle" disableInteractive={true} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-white">{professor.name}</h4>
        <StarRating rating={professor.rating} maxRating={professor.max_rating} animate={animate} />
      </div>
      
      <div className="space-y-2">
        {professor.reviews?.map((review: any, idx: number) => (
          <div key={idx} className="text-sm text-white/80 p-2 bg-white/5 rounded">
            <div className="flex items-center gap-2 mb-1">
              <SourceIcon source={review.source} />
              <span className="text-xs text-white/60">{review.date}</span>
            </div>
            <p>"{review.text}"</p>
          </div>
        ))}
        
        {professor.minority_opinions && professor.minority_opinions.length > 0 && (
          <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded">
            <p className="text-xs text-orange-300 font-medium mb-1">Alternative perspectives:</p>
            {professor.minority_opinions.map((opinion: string, idx: number) => (
              <p key={idx} className="text-xs text-white/70">• {opinion}</p>
            ))}
          </div>
        )}
      </div>
    </LiquidGlassContainer>
  )
}

// Helper function to convert Unix timestamp to readable date
const formatPostDate = (created_utc: number) => {
  if (!created_utc) return 'Unknown date'
  const date = new Date(created_utc * 1000)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
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

// Grade Distribution Radar Chart Component
const GradeDistributionRadar = ({ gradeText, animate }: { gradeText: string; animate: boolean }) => {
  const [animatedData, setAnimatedData] = useState<any[]>([])
  
  // Parse the grade distribution text to extract components and weights
  const parseGradeDistribution = (text: string) => {
    const components = []
    const lowerText = text.toLowerCase()
    
    // Common grade components with estimated weights based on text analysis
    if (lowerText.includes('quiz')) {
      const weight = lowerText.includes('mostly') || lowerText.includes('primarily') ? 85 : 
                    lowerText.includes('few') || lowerText.includes('minimal') ? 25 : 45
      components.push({ subject: 'Quizzes', value: weight, fullMark: 100 })
    }
    
    if (lowerText.includes('participation')) {
      const weight = lowerText.includes('minimal') || lowerText.includes('no participation') ? 15 : 
                    lowerText.includes('heavy') || lowerText.includes('important') ? 40 : 25
      components.push({ subject: 'Participation', value: weight, fullMark: 100 })
    }
    
    if (lowerText.includes('project')) {
      const weight = lowerText.includes('heavy') || lowerText.includes('major') ? 85 : 
                    lowerText.includes('small') || lowerText.includes('minor') ? 35 : 60
      components.push({ subject: 'Projects', value: weight, fullMark: 100 })
    }
    
    if (lowerText.includes('research')) {
      const weight = lowerText.includes('extensive') || lowerText.includes('major') ? 70 : 45
      components.push({ subject: 'Research', value: weight, fullMark: 100 })
    }
    
    if (lowerText.includes('exam') || lowerText.includes('test') || lowerText.includes('midterm') || lowerText.includes('final')) {
      const weight = lowerText.includes('minimal') || lowerText.includes('no exam') || lowerText.includes('no heavy') ? 20 : 
                    lowerText.includes('heavy') || lowerText.includes('mostly') ? 90 : 65
      components.push({ subject: 'Exams', value: weight, fullMark: 100 })
    }
    
    if (lowerText.includes('homework') || lowerText.includes('assignment')) {
      const weight = lowerText.includes('heavy') || lowerText.includes('lots') ? 80 : 
                    lowerText.includes('minimal') || lowerText.includes('few') ? 30 : 50
      components.push({ subject: 'Homework', value: weight, fullMark: 100 })
    }
    
    // Check for attendance/lab components
    if (lowerText.includes('attendance') || lowerText.includes('lab')) {
      const weight = lowerText.includes('mandatory') || lowerText.includes('required') ? 30 : 20
      components.push({ subject: 'Attendance/Lab', value: weight, fullMark: 100 })
    }
    
    // Add default components with more varied values if none found
    if (components.length === 0) {
      components.push(
        { subject: 'Assignments', value: 55, fullMark: 100 },
        { subject: 'Participation', value: 20, fullMark: 100 },
        { subject: 'Exams', value: 80, fullMark: 100 },
        { subject: 'Projects', value: 35, fullMark: 100 },
        { subject: 'Quizzes', value: 40, fullMark: 100 }
      )
    }
    
    // Ensure we have at least 3 components for a good radar chart
    if (components.length < 3) {
      const existingSubjects = components.map(c => c.subject)
      const additionalComponents = [
        { subject: 'Homework', value: 45, fullMark: 100 },
        { subject: 'Participation', value: 25, fullMark: 100 },
        { subject: 'Final Exam', value: 75, fullMark: 100 },
        { subject: 'Attendance', value: 15, fullMark: 100 }
      ]
      
      for (const comp of additionalComponents) {
        if (!existingSubjects.includes(comp.subject) && components.length < 5) {
          components.push(comp)
        }
      }
    }
    
    return components
  }
  
  const staticData = parseGradeDistribution(gradeText)
  
  useEffect(() => {
    if (animate) {
      // Start with zero values
      setAnimatedData(staticData.map(item => ({ ...item, value: 0 })))
      
      // Animate to full values
      const timer = setTimeout(() => {
        setAnimatedData(staticData)
      }, 200)
      
      return () => clearTimeout(timer)
    } else {
      setAnimatedData(staticData)
    }
  }, [animate, gradeText])
  
  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={animatedData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
          <PolarGrid 
            stroke="rgba(255, 255, 255, 0.2)" 
            strokeWidth={1}
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: 'rgba(255, 255, 255, 0.8)', 
              fontSize: 12,
              fontFamily: 'ABC Diatype, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 100
            }}
            className="text-white"
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false}
            tickCount={6}
          />
          <Radar
            name="Grade Weight"
            dataKey="value"
            stroke="#60A5FA"
            fill="rgba(96, 165, 250, 0.3)"
            strokeWidth={2}
            dot={false}
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StructuredResultsDisplay({ results, onReset }: StructuredResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("sentiment")
  // Animation states for workload cards
  const [animateWorkload, setAnimateWorkload] = useState(false)
  // Animation state for professor stars
  const [animateProfessors, setAnimateProfessors] = useState(false)
  // Animation state for grade distribution radar
  const [animateGrades, setAnimateGrades] = useState(false)
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
  useEffect(() => {
    if (activeTab === "grades") {
      setAnimateGrades(false)
      // Small delay to ensure reset, then trigger animation
      const timer = setTimeout(() => {
        setAnimateGrades(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setAnimateGrades(false)
    }
  }, [activeTab])

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
    { id: "grades", label: "Grade Distribution", icon: FileText },
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
                glassIntensity={isActive ? 0.6 : hasData ? 0.3 : 0.1}
                className={`flex items-center px-4 py-2 text-sm font-medium transition-all ${
                  !hasData
                    ? "bg-white/5 text-white/30 cursor-not-allowed border-white/10"
                    : isActive
                    ? isDatabase
                      ? "bg-[#0B6B3A]/80 text-white shadow-lg border-[#0B6B3A]/50"
                      : isReddit
                      ? "bg-[#CC4125]/80 text-white shadow-lg border-[#CC4125]/50"
                      : "bg-white/30 text-white shadow-lg border-white/40"
                    : "bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border-white/20"
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
                  <Icon className={`mr-2 h-4 w-4 ${!hasData ? 'opacity-30' : ''}`} />
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

        {/* Grade Distribution Tab */}
        {activeTab === "grades" && (
          <LiquidGlassContainer variant="default" disableInteractive={true} className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Grade Distribution</h3>
            
            {data.grade_distribution ? (
              <div className="space-y-6">
                {/* Original Description */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Student Insights</h4>
                  <p className="text-white/90 leading-relaxed">
                    {data.grade_distribution}
                  </p>
                </div>
                
                {/* Radar Chart */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 pointer-events-none">
                  <h4 className="text-lg font-semibold text-white mb-4 text-center">Grade Component Weights</h4>
                  <GradeDistributionRadar gradeText={data.grade_distribution || ""} animate={animateGrades} />
                  <p className="text-white/50 text-xs text-center mt-4 italic">
                    *Please note this chart may not be fully accurate but instead is a general estimation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No grade distribution information available</p>
                <p className="text-white/40 text-sm mt-2">Check other tabs for course insights</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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