"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, LinkIcon, ArrowLeft } from "lucide-react"

interface ResultsDisplayProps {
  results: {
    summary: string
    links: { title: string; url: string }[]
  } | null
  onReset: () => void
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  if (!results) return null

  return (
    <div className="w-full max-w-2xl">
      <Button onClick={onReset} variant="ghost" className="mb-4 text-white/80 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        New Search
      </Button>
      <Card className="bg-white/20 text-white backdrop-blur-2xl border-white/20 shadow-2xl ring-1 ring-inset ring-white/10">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Bot className="mr-3 h-7 w-7" />
            AI Flaw Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-white/90 leading-relaxed">{results.summary}</p>
          <div>
            <h3 className="mb-3 text-xl font-semibold flex items-center">
              <LinkIcon className="mr-3 h-6 w-6" />
              Relevant Reddit Links
            </h3>
            <ul className="space-y-2">
              {results.links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md bg-white/5 p-3 transition-colors hover:bg-white/10"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
