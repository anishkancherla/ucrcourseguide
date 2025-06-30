"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star, BarChart2, Users, Lightbulb, AlertTriangle, FileText, MessageCircle, Database, LinkIcon } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import redditLogo from "@/app/images/redditlogo.png"
import googleSheetsLogo from "@/app/images/googlesheetslogo.png"

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
const StarRating = ({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <Star className="absolute inset-0 h-4 w-4 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-2 text-sm text-white/80">{rating.toFixed(1)}/{maxRating}</span>
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
    return <span className="text-blue-400">🏛️</span> // You can change this icon
  }
  return <span className="text-orange-400">👽</span> // You can change this icon
}

// Professor Card Component
const ProfessorCard = ({ professor }: { professor: any }) => {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 hover:bg-white/15 transition-all">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-white">{professor.name}</h4>
        <StarRating rating={professor.rating} maxRating={professor.max_rating} />
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
      </div>
      
      {professor.minority_opinions?.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10">
          {professor.minority_opinions.map((opinion: string, idx: number) => (
            <p key={idx} className="text-xs text-white/50 italic">
              *Minority opinion: {opinion}*
            </p>
          ))}
        </div>
      )}
    </Card>
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

// Function to filter and prioritize relevant Reddit posts
const filterRelevantPosts = (posts: any[]) => {
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
    .slice(0, 10) // Top 10 most relevant posts
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

  if (!results || !results.structured_data) return null

  const data = results.structured_data

  const tabs = [
    { id: "sentiment", label: "Overall Sentiment", icon: Star },
    { id: "difficulty", label: "Difficulty", icon: BarChart2 },
    { id: "professors", label: "Professors", icon: Users },
    { id: "advice", label: "Advice & Tips", icon: Lightbulb },
    { id: "pitfalls", label: "Common Pitfalls", icon: AlertTriangle },
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
      <Card className="bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            {results.keyword?.toUpperCase()}
          </CardTitle>
          <div className="text-sm text-white/60 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            {results.analysis_metadata?.total_posts_analyzed && (
              <span className="flex items-center gap-2">
                <Image src={redditLogo} alt="Reddit" width={20} height={20} className="object-contain" />
                {results.analysis_metadata.total_posts_analyzed} Reddit posts analyzed
              </span>
            )}
            {results.analysis_metadata?.ucr_database_included && (
              <span className="flex items-center gap-2">
                <Image src={googleSheetsLogo} alt="Google Sheets" width={16} height={16} className="object-contain" />
                UCR Database included
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-white/10 p-1 rounded-lg backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isDatabase = tab.id === "database"
          const isReddit = tab.id === "reddit"
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isDatabase
                  ? activeTab === tab.id
                    ? "bg-[#0B6B3A] text-white shadow-lg" // Even darker Google Sheets green when active
                    : "bg-[#0D7C47] text-white shadow-md" // Darker Google Sheets green for better logo visibility
                  : isReddit
                  ? activeTab === tab.id
                    ? "bg-[#CC4125] text-white shadow-lg" // Darker Reddit orange when active
                    : "bg-[#FF4500] text-white shadow-md" // Default Reddit orange
                  : activeTab === tab.id
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {isReddit ? (
                <Image src={redditLogo} alt="Reddit" width={20} height={20} className="mr-2 object-contain" />
              ) : isDatabase ? (
                <Image src={googleSheetsLogo} alt="Google Sheets" width={16} height={16} className="mr-2 object-contain" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overall Sentiment Tab */}
        {activeTab === "sentiment" && data.overall_sentiment && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Overall Sentiment</h3>
            <p className="text-white/90 mb-4 text-lg">{data.overall_sentiment.summary}</p>
            
            {data.overall_sentiment.workload && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white">Workload & Time Commitment</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-3 rounded">
                    <p className="text-sm text-white/70">Hours per week</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.hours_per_week}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded">
                    <p className="text-sm text-white/70">Assignments</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.assignments}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded">
                    <p className="text-sm text-white/70">Time commitment</p>
                    <p className="text-white font-medium">{data.overall_sentiment.workload.time_commitment}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Difficulty Tab */}
        {activeTab === "difficulty" && data.difficulty && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
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
          </Card>
        )}

        {/* Professors Tab */}
        {activeTab === "professors" && data.professors && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Professors & What Students Say</h3>
            <p className="text-white/70 text-sm mb-6">
              Sorted by highest to lowest rating
            </p>
            <div className="grid gap-4">
              {data.professors
                .sort((a, b) => b.rating - a.rating) // Sort by rating, highest first
                .map((professor, idx) => (
                <ProfessorCard key={idx} professor={professor} />
              ))}
            </div>
          </Card>
        )}

        {/* Advice Tab */}
        {activeTab === "advice" && data.advice && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Advice & Tips for Success</h3>
            <div className="space-y-4">
              {data.advice.course_specific_tips?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Course-Specific Tips</h4>
                  <ol className="space-y-2">
                    {data.advice.course_specific_tips.map((tip, idx) => (
                      <li key={idx} className="text-white/80 flex items-start">
                        <span className="text-blue-400 mr-2 font-bold">{idx + 1}.</span>
                        {tip}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              
              {data.advice.resources?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Recommended Resources</h4>
                  <ul className="space-y-2">
                    {data.advice.resources.map((resource, idx) => (
                      <li key={idx} className="text-white/80 flex items-start">
                        <span className="text-purple-400 mr-2">📚</span>
                        {resource}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Common Pitfalls Tab */}
        {activeTab === "pitfalls" && data.common_pitfalls && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Common Pitfalls</h3>
            <div className="space-y-3">
              {data.common_pitfalls.map((pitfall, idx) => (
                <div key={idx} className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                  <div className="flex items-start">
                    <span className="text-red-400 mr-2">⚠️</span>
                    <p className="text-white/90">{pitfall}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

                 {/* Grade Distribution Tab */}
         {activeTab === "grades" && (
           <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
             <h3 className="text-xl font-bold text-white mb-4">Grade Distribution</h3>
             <p className="text-white/90">
               {data.grade_distribution || "No clear information available about grade distribution."}
             </p>
           </Card>
         )}

         {/* Reddit Posts Tab */}
         {activeTab === "reddit" && results.raw_data?.posts && (
           <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
             <h3 className="text-xl font-bold text-white mb-4">Relevant Reddit Posts</h3>
             <p className="text-white/70 text-sm mb-6">
               Posts prioritized by recency and student opinions, advice, and course-relevant content
             </p>
             <div className="space-y-4">
               {filterRelevantPosts(results.raw_data.posts).map((postData: any, idx: number) => (
                 <Card key={idx} className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-all">
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
                       📅 {postData.formattedDate}
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
                           {category.icon} {category.label}
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
                 </Card>
               ))}
             </div>
           </Card>
         )}

         {/* Database Tab */}
         {activeTab === "database" && results.raw_data?.ucr_database && (
           <Card className="bg-white/10 backdrop-blur-2xl border-white/20 p-6">
             <h3 className="text-xl font-bold text-white mb-4">UCR Class Difficulty Database</h3>
             <p className="text-white/70 text-sm mb-6">
               Student reviews from the UCR class difficulty spreadsheet
             </p>
             
             {(() => {
               const parsedData = parseUCRDatabaseData(results.raw_data.ucr_database)
               
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
                         <p className="text-3xl font-bold text-orange-300">{parsedData.overallDifficulty}</p>
                       </div>
                     </div>
                   </div>

                   {/* Reviews Table */}
                   <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
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
           </Card>
         )}
       </div>
     </div>
   )
 } 