"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, LinkIcon, ArrowLeft, Brain, Users, Clock, BookOpen, Lightbulb, AlertTriangle, Database, MessageCircle } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from "react"

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
      posts: any[]
      ucr_database: string
    }
  } | null
  onReset: () => void
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'reddit' | 'database'>('analysis')
  
  if (!results) return null

  const hasAIAnalysis = results.ai_analysis?.success && results.ai_analysis?.ai_summary
  const hasRedditData = results.links && results.links.length > 0
  const hasDatabaseData = results.ucr_database_included || results.raw_data?.ucr_database

  // tab setup
  const tabs = [
    {
      id: 'analysis' as const,
      label: 'AI Analysis',
      icon: Brain,
      available: hasAIAnalysis,
    },
    {
      id: 'reddit' as const,
      label: 'Reddit Data',
      icon: MessageCircle,
      available: hasRedditData,
    },
    {
      id: 'database' as const,
      label: 'UCR Database',
      icon: Database,
      available: hasDatabaseData,
    },
  ]

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        New Search
      </Button>
      
      {/* tab navigation */}
      <div className="flex space-x-1 bg-white/10 p-1 rounded-lg backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : tab.available
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
              {!tab.available && (
                <span className="ml-2 text-xs text-white/40">(No data)</span>
              )}
            </button>
          )
        })}
      </div>

      {/* tab content */}
      {activeTab === 'analysis' && hasAIAnalysis && (
        <Card className="bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl ring-1 ring-inset ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Brain className="mr-3 h-7 w-7 text-purple-300" />
              Course Cheat-Sheet: {results.ai_analysis?.course?.toUpperCase()}
            </CardTitle>
            <div className="text-sm text-white/60 flex items-center space-x-4">
              {results.ai_analysis?.analysis_metadata?.total_posts_analyzed && (
                <span>📝 {results.ai_analysis.analysis_metadata.total_posts_analyzed} posts analyzed</span>
              )}
              {results.ai_analysis?.analysis_metadata?.total_comments_analyzed && (
                <span>💬 {results.ai_analysis.analysis_metadata.total_comments_analyzed} comments analyzed</span>
              )}
              {results.ai_analysis?.analysis_metadata?.ucr_database_included && (
                <span>UCR Database included</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-invert max-w-none text-white/90 leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h4: (props) => <h4 className="text-lg font-semibold text-white mt-6 mb-3 flex items-center" {...props} />,
                  h3: (props) => <h3 className="text-xl font-bold text-white mt-6 mb-4" {...props} />,
                  ul: (props) => <ul className="list-disc list-inside space-y-1 text-white/80" {...props} />,
                  ol: (props) => <ol className="list-decimal list-inside space-y-1 text-white/80" {...props} />,
                  li: (props) => <li className="text-white/80" {...props} />,
                  p: (props) => <p className="text-white/90 mb-3" {...props} />,
                  strong: (props) => <strong className="text-white font-semibold" {...props} />,
                  em: (props) => <em className="text-purple-300" {...props} />,
                  table: (props) => (
                    <div className="overflow-x-auto my-6">
                      <table className="w-full border-collapse bg-white/5 rounded-lg overflow-hidden shadow-lg" {...props} />
                    </div>
                  ),
                  thead: (props) => (
                    <thead className="bg-white/10" {...props} />
                  ),
                  tbody: (props) => (
                    <tbody className="divide-y divide-white/10" {...props} />
                  ),
                  tr: (props) => (
                    <tr className="hover:bg-white/5 transition-colors" {...props} />
                  ),
                  th: (props) => (
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm uppercase tracking-wider border-b border-white/20" {...props} />
                  ),
                  td: (props) => (
                    <td className="px-4 py-3 text-white/90 text-sm border-b border-white/10" {...props} />
                  ),
                }}
              >
                {results.ai_analysis?.ai_summary || 'No analysis available'}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reddit' && hasRedditData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <MessageCircle className="mr-3 h-6 w-6 text-blue-300" />
              Reddit Discussions from r/UCR
            </CardTitle>
            <p className="text-white/60 text-sm">original reddit posts analyzed for this course</p>
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

      {activeTab === 'database' && hasDatabaseData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Database className="mr-3 h-6 w-6 text-green-300" />
              UCR Class Difficulty Database
            </CardTitle>
            <p className="text-white/60 text-sm">student reviews from the ucr class difficulty spreadsheet</p>
          </CardHeader>
          <CardContent>
            {results.raw_data?.ucr_database ? (
              <div className="bg-white/5 rounded-lg p-4 font-mono text-sm text-white/80 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {results.raw_data.ucr_database}
              </div>
            ) : (
              <p className="text-white/60">UCR database data was included in the analysis but detailed content not available for display.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* no data fallback */}
      {activeTab === 'analysis' && !hasAIAnalysis && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Analysis Unavailable</h3>
            <p className="text-white/60">The AI analysis couldn't be completed. Check the other tabs for raw data.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reddit' && !hasRedditData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <MessageCircle className="mx-auto h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reddit Data</h3>
            <p className="text-white/60">No relevant discussions found on r/UCR for this course.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'database' && !hasDatabaseData && (
        <Card className="bg-white/10 text-white backdrop-blur-2xl border-white/20 shadow-xl ring-1 ring-inset ring-white/10">
          <CardContent className="text-center py-8">
            <Database className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Database Data</h3>
            <p className="text-white/60">This course wasn't found in the UCR class difficulty database.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
