"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchFormProps {
  onSearch: (query: string) => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 rounded-2xl bg-white/20 backdrop-blur-2xl p-8 text-center text-white shadow-2xl ring-1 ring-inset ring-white/10 md:p-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-400/70 via-purple-400/70 to-blue-500/70 shadow-lg">
        <Search className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">repflaws</h1>
      <p className="max-w-md text-white/80">
        Enter a product name to get a summary of common flaws found in replicas, along with the most
        relevant Reddit discussions.
      </p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center space-x-2">
        <Input
          type="text"
          placeholder="e.g., 'Air Jordan 1 Chicago'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-white/20 text-white placeholder:text-white/60 border-white/30 focus:ring-white/50"
        />
        <Button type="submit" size="icon" className="bg-white/20 hover:bg-white/30">
          <Search className="h-5 w-5 text-white" />
        </Button>
      </form>
    </div>
  )
}
