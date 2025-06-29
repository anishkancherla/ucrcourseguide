"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LinkIcon,
  ArrowLeft,
  Brain,
  Users,
  AlertTriangle,
  Database,
  MessageCircle,
  Book,
  BarChart2,
  Clock,
  Lightbulb,
  List,
  Star,
  FileText,
  GraduationCap,
  ChevronRight,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useState, useMemo, useEffect } from "react"
import type { FC } from "react"

interface PostData {
  post: {
    title: string
    url: string
    subreddit: string
    score: number
    num_comments: number
  }
}

interface ResultsDisplayProps {
  results: {
    summary: string
    links: { title: string; url: string; score?: number; comments?: number }[]
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
    keyword?: string
    totalPosts?: number
    ucr_database_included?: boolean
    raw_data?: {
      course: string
      posts: PostData[]
      ucr_database: string
    }
  } | null
  onReset: () => void
}

const parseMarkdownSections = (markdownText: string | undefined) => {
  if (!markdownText) {
    return []
  }
  return markdownText
    .split(/\n(?=#{2,4}\s)/)
    .map((section) => {
      const trimmed = section.trim()
      if (!trimmed) return null
      const lines = trimmed.split("\n")
      const title = (lines.shift() || "").replace(/^#{2,4}\s/, "").trim()
      let content = lines
        .join("\n")
        .trim()
        .replace(/^\s*–\s/gm, "* ") 

      if (title === "UCR Database Review Summary") {
        content = content.replace(
          "This summary should help you gauge the course's expectations and how to succeed.",
          "",
        )
      }
      return { title, content }
    })
    .filter((s): s is { title: string; content: string } => !!s && !!s.title && !!s.content)
}

const sectionIcons: { [key: string]: FC<React.ComponentProps<"svg">> } = {
  "Overall Sentiment": Star,
  Difficulty: BarChart2,
  "Workload & Time Commitment": Clock,
  "Popular Professors & What Students Say": Users,
  "Key Concepts / Topics Covered": GraduationCap,
  "Advice & Tips for Success": Lightbulb,
  "Recommended Resources": Book,
  "Common Pitfalls": AlertTriangle,
  "Grade Distribution Perception": FileText,
  "Notable Minority Opinions": MessageCircle,
  "UCR Database Review Summary": Database,
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "reddit" | "database">("analysis")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [cardRect, setCardRect] = useState<DOMRect | null>(null)

  const hasAIAnalysis = results?.ai_analysis?.success && results?.ai_analysis?.ai_summary
  const hasRedditData = results?.links && results?.links.length > 0
  const hasDatabaseData = results?.ucr_database_included || results?.raw_data?.ucr_database

  const tabs = useMemo(
    () => [
      { id: "analysis" as const, label: "AI Analysis", icon: Brain, available: hasAIAnalysis },
      { id: "reddit" as const, label: "Reddit Data", icon: MessageCircle, available: hasRedditData },
      { id: "database" as const, label: "UCR Database", icon: Database, available: hasDatabaseData },
    ],
    [hasAIAnalysis, hasRedditData, hasDatabaseData],
  )

  useEffect(() => {
    const currentTab = tabs.find((t) => t.id === activeTab)
    if (!currentTab || !currentTab.available) {
      const firstAvailable = tabs.find((t) => t.available)
      if (firstAvailable) {
        setActiveTab(firstAvailable.id)
      }
    }
  }, [tabs, activeTab])

  const parsedSections = useMemo(() => {
    if (results?.ai_analysis?.ai_summary) {
      const sections = parseMarkdownSections(results.ai_analysis.ai_summary)
      const dbSummaryIndex = sections.findIndex((s) => s.title === "UCR Database Review Summary")
      const difficultyIndex = sections.findIndex((s) => s.title === "Difficulty")

      if (dbSummaryIndex > -1 && difficultyIndex > -1) {
        const [dbSummary] = sections.splice(dbSummaryIndex, 1)
        sections.splice(difficultyIndex + 1, 0, dbSummary)
      }

      const minorityOpinionsIndex = sections.findIndex((s) => s.title === "Notable Minority Opinions")
      if (minorityOpinionsIndex > -1) {
        const [minorityOpinions] = sections.splice(minorityOpinionsIndex, 1)
        sections.push(minorityOpinions)
      }

      return sections
    }
    return []
  }, [results?.ai_analysis?.ai_summary])

  type MarkdownComponentProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node?: any
    children?: React.ReactNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  const markdownComponents = {
    h4: (props: MarkdownComponentProps) => (
      <h4 className="text-lg font-diatype-bold text-white mt-4 mb-2" {...props} />
    ),
    h3: (props: MarkdownComponentProps) => (
      <h3 className="text-xl font-diatype-bold text-white mt-4 mb-2" {...props} />
    ),
    ul: (props: MarkdownComponentProps) => (
      <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/80" {...props} />
    ),
    ol: (props: MarkdownComponentProps) => (
      <ol className="list-decimal list-inside space-y-1.5 pl-2 text-white/80" {...props} />
    ),
    li: (props: MarkdownComponentProps) => <li className="text-white/80" {...props} />,
    p: (props: MarkdownComponentProps) => <p className="text-white/90 mb-3" {...props} />,
    strong: (props: MarkdownComponentProps) => <strong className="text-white font-diatype-bold" {...props} />,
    em: (props: MarkdownComponentProps) => <em className="text-purple-300" {...props} />,
    table: (props: MarkdownComponentProps) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse bg-white/5 rounded-lg overflow-hidden shadow-lg" {...props} />
      </div>
    ),
    thead: (props: MarkdownComponentProps) => <thead className="bg-white/10" {...props} />,
    tbody: (props: MarkdownComponentProps) => <tbody className="divide-y divide-white/10" {...props} />,
    tr: (props: MarkdownComponentProps) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
    th: (props: MarkdownComponentProps) => (
      <th className="px-4 py-3 text-left font-diatype-bold text-white text-sm uppercase tracking-wider" {...props} />
    ),
    td: (props: MarkdownComponentProps) => <td className="px-4 py-3 text-white/90 text-sm" {...props} />,
  }

  const handleSectionClick = (sectionTitle: string, event: React.MouseEvent) => {
    const cardElement = event.currentTarget as HTMLElement
    const rect = cardElement.getBoundingClientRect()
    setCardRect(rect)
    setExpandedSection(sectionTitle)
    setIsAnimating(true)
    
    // Start animation on next frame for immediate response
    requestAnimationFrame(() => {
      setIsAnimating(false)
    })
  }

  const handleBackToOverview = () => {
    setIsAnimating(true)
    // Allow the contraction animation to complete before removing the expanded section
    setTimeout(() => {
      setExpandedSection(null)
      setCardRect(null)
      setIsAnimating(false)
    }, 500) // Match the CSS transition duration
  }

  if (!results) return null

  const numColumns = 3
  const columns: { title: string; content: string }[][] = Array.from({ length: numColumns }, () => [])
  parsedSections.forEach((section, index) => {
    columns[index % numColumns].push(section)
  })

  return (
    <div className="w-full space-y-6">
      <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        New Search
      </Button>

      <div className="flex space-x-1 bg-white/10 p-1 rounded-lg backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-diatype-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white/20 text-white shadow-lg"
                  : tab.available
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-white/30 cursor-not-allowed"
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
              {!tab.available && <span className="ml-2 text-xs text-white/40">(No data)</span>}
            </button>
          )
        })}
      </div>

      {activeTab === "analysis" && hasAIAnalysis && (
        <div className="space-y-6">
          <Card className="bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl ring-1 ring-inset ring-white/10">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                {results.ai_analysis?.course?.toUpperCase()}
              </CardTitle>
              <div className="text-sm text-white/60 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                {results.ai_analysis?.analysis_metadata?.total_posts_analyzed && (
                  <span>📝 {results.ai_analysis.analysis_metadata.total_posts_analyzed} posts analyzed</span>
                )}
                {results.ai_analysis?.analysis_metadata?.total_comments_analyzed && (
                  <span>💬 {results.ai_analysis.analysis_metadata.total_comments_analyzed} comments analyzed</span>
                )}
                {results.ai_analysis?.analysis_metadata?.ucr_database_included && (
                  <span className="flex items-center">
                    <Database className="mr-1.5 h-4 w-4" /> UCR Database included
                  </span>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Animated expanding card */}
          {expandedSection && (
            <div className="fixed inset-0 z-50 pointer-events-none">
              <Card 
                className="absolute bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl ring-1 ring-inset ring-white/10 transition-all duration-500 ease-out pointer-events-auto"
                style={{
                  left: isAnimating && cardRect ? `${cardRect.left}px` : '16px',
                  top: isAnimating && cardRect ? `${cardRect.top}px` : '16px',
                  width: isAnimating && cardRect ? `${cardRect.width}px` : 'calc(100vw - 32px)',
                  height: isAnimating && cardRect ? `${cardRect.height}px` : 'calc(100vh - 32px)',
                  transform: isAnimating ? 'scale(1)' : 'scale(1)',
                }}
              >
                {!isAnimating && (
                  <>
                    <CardHeader className="border-b border-white/20 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {(() => {
                            const section = parsedSections.find(s => s.title === expandedSection)
                            const Icon = section ? sectionIcons[section.title] || List : List
                            return <Icon className="mr-3 h-6 w-6 text-purple-300" />
                          })()}
                          <CardTitle className="text-2xl font-diatype-bold">{expandedSection}</CardTitle>
                        </div>
                        <Button
                          onClick={handleBackToOverview}
                          variant="ghost"
                          className="text-white/80 hover:text-white"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Overview
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 h-full">
                      <div className="prose prose-invert max-w-none text-white/90 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {parsedSections.find(s => s.title === expandedSection)?.content || ''}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </>
                )}
                {isAnimating && (
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center">
                        {(() => {
                          const section = parsedSections.find(s => s.title === expandedSection)
                          const Icon = section ? sectionIcons[section.title] || List : List
                          return <Icon className="mr-3 h-5 w-5 text-purple-300 shrink-0" />
                        })()}
                        <span>{expandedSection}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/60 opacity-0" />
                    </CardTitle>
                  </CardHeader>
                )}
              </Card>
            </div>
          )}

          {/* Section Cards Overview */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${expandedSection ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {parsedSections.map((section, index) => {
              const Icon = sectionIcons[section.title] || List
              return (
                <Card
                  key={index}
                  className={`bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl ring-1 ring-inset ring-white/10 cursor-pointer hover:bg-white/25 transition-all duration-200 hover:scale-105 group ${
                    expandedSection === section.title ? 'invisible' : 'visible'
                  }`}
                  onClick={(e) => handleSectionClick(section.title, e)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className="mr-3 h-5 w-5 text-purple-300 shrink-0" />
                        <span>{section.title}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/60 group-hover:text-white transition-colors" />
                    </CardTitle>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "reddit" && hasRedditData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <MessageCircle className="mr-3 h-6 w-6 text-blue-300" />
              Reddit Discussions from r/UCR
            </CardTitle>
            <p className="text-white/60 text-sm">Relevant Reddit posts analyzed for this course</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.links?.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md bg-white/5 p-4 transition-all hover:bg-white/15 border border-white/10 hover:border-white/30"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-white/90 flex-1 pr-4">{link.title}</span>
                      <div className="flex gap-3 text-xs text-white/60 shrink-0">
                        {link.score !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {link.score}
                          </span>
                        )}
                        {link.comments !== undefined && (
                          <span className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            {link.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {activeTab === "database" && hasDatabaseData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Database className="mr-3 h-6 w-6 text-green-300" />
              UCR Class Difficulty Database
            </CardTitle>
            <p className="text-white/60 text-sm">Student reviews from the UCR class difficulty spreadsheet</p>
          </CardHeader>
          <CardContent>
            {results.raw_data?.ucr_database ? (
              <div className="bg-white/5 rounded-lg p-4 font-mono text-sm text-white/80 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {results.raw_data.ucr_database}
              </div>
            ) : (
              <p className="text-white/60">
                UCR database data was included in the analysis but detailed content not available for display.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback cards */}
      {activeTab === "analysis" && !hasAIAnalysis && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-diatype-bold mb-2">AI Analysis Unavailable</h3>
            <p className="text-white/60">The AI analysis could not be completed. Check the other tabs for raw data.</p>
          </CardContent>
        </Card>
      )}
      {activeTab === "reddit" && !hasRedditData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <MessageCircle className="mx-auto h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-lg font-diatype-bold mb-2">No Reddit Data</h3>
            <p className="text-white/60">No relevant discussions found on r/UCR for this course.</p>
          </CardContent>
        </Card>
      )}
      {activeTab === "database" && !hasDatabaseData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <Database className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-diatype-bold mb-2">No Database Data</h3>
            <p className="text-white/60">This course was not found in the UCR class difficulty database.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
