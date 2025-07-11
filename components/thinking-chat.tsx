'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Loader2, Send, Copy } from 'lucide-react'
import { SearchResultsDisplay } from '@/components/search-results-display'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { CitationTooltip } from '@/components/citation-tooltip'
import { cn } from '@/lib/utils'

// Import the ThinkingEvent type from thinking-display
import type { ThinkingEvent } from '@/components/thinking-display'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  searchData?: {
    status: 'searching' | 'complete' | 'error'
    events: ThinkingEvent[]
  }
  sources?: Array<{ url: string; title: string; description?: string }>
}

const SUGGESTED_QUERIES = [
  "What are the latest AI breakthroughs in 2025 and how do they compare to previous years?",
  "Find me the 2nd sentence of the 3rd and 5th blog post on firecrawl.dev and analyze their content",
  "Compare the latest features and pricing between Samsung Galaxy S24 Ultra and iPhone 15 Pro Max, including camera specs and AI capabilities"
]

interface ThinkingChatProps {
  onMessagesChange?: (hasMessages: boolean) => void
  hasFirecrawlKey?: boolean
  onApiKeyRequired?: () => void
  onBrowserClose?: () => void
}

export function ThinkingChat({ onMessagesChange, hasFirecrawlKey = false, onApiKeyRequired }: ThinkingChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ url: string; title: string; description?: string }>>([])
  const [currentQuery, setCurrentQuery] = useState('')
  const [currentScrapingUrl, setCurrentScrapingUrl] = useState('')
  const [screenshots, setScreenshots] = useState<Array<{ url: string; screenshot?: string }>>([])
  const [showFullWidth, setShowFullWidth] = useState(false)
  const [hasAnimatedSuggestions, setHasAnimatedSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Notify parent when messages change
  useEffect(() => {
    onMessagesChange?.(messages.length > 0)
  }, [messages.length, onMessagesChange])

  // Mark suggestions as animated after first show
  useEffect(() => {
    if (showSuggestions && !hasAnimatedSuggestions) {
      // Set after animations complete
      const timer = setTimeout(() => {
        setHasAnimatedSuggestions(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [showSuggestions, hasAnimatedSuggestions])

  const handleSearch = async (query: string) => {
    if (!query.trim() || isSearching) return

    // Check if Firecrawl API key is available
    if (!hasFirecrawlKey && !localStorage.getItem('firecrawl_api_key')) {
      onApiKeyRequired?.()
      return
    }

    // Start transition animation
    setIsTransitioning(true)
    
    // Wait for fade animation
    await new Promise(resolve => setTimeout(resolve, 300))

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsSearching(true)
    setShowSuggestions(false)
    setSearchResults([]) // Clear current search results for this query
    setCurrentScrapingUrl('') // Reset scraping URL
    setScreenshots([]) // Clear screenshots
    setIsTransitioning(false)

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      searchData: {
        status: 'searching',
        events: []
      }
    }

    setMessages(prev => [...prev, assistantMessage])


    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      
      // Add Firecrawl API key from localStorage if available
      const firecrawlKey = localStorage.getItem('firecrawl_api_key')
      
      if (firecrawlKey) headers['X-Firecrawl-API-Key'] = firecrawlKey
      
      const response = await fetch('/api/open-researcher', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        // API Error occurred
        throw new Error(errorData.error || errorData.message || 'Search failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      const events: ThinkingEvent[] = []
      let finalContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'event') {
                events.push(data.event)
                
                // Parse search results from tool results
                if (data.event.type === 'tool_result' && data.event.tool === 'web_search') {
                  const resultText = data.event.result
                  const parsedResults = parseSearchResults(resultText)
                  setSearchResults(parsedResults)
                  
                  // Extract screenshots if available
                  if (data.event.screenshots) {
                    setScreenshots(data.event.screenshots)
                  }
                  
                  // Check if results mention scraping is happening
                  if (resultText.includes('(SCRAPED)')) {
                    // Find first scraped URL
                    const scrapedMatch = resultText.match(/URL: (https?:\/\/[^\s]+).*?\(SCRAPED\)/)
                    if (scrapedMatch) {
                      setTimeout(() => {
                        setCurrentScrapingUrl(scrapedMatch[1])
                      }, 1000) // Show search results first, then switch to scraping
                    }
                  }
                }
                
                // Track current scraping URL and handle web_search with scraping
                if (data.event.type === 'tool_call') {
                  if (data.event.tool === 'web_search' || data.event.tool === 'firecrawl_search') {
                    // Update the query in the URL bar immediately
                    const searchQuery = (data.event.parameters as { query?: string })?.query || ''
                    setCurrentQuery(searchQuery)
                    setCurrentScrapingUrl('')  // Clear to show search results
                  } else if (data.event.tool === 'firecrawl_scrape' || data.event.tool === 'deep_scrape') {
                    const sourceUrl = (data.event.parameters as { source_url?: string })?.source_url || ''
                    setCurrentScrapingUrl(sourceUrl)
                  }
                } else if (data.event.type === 'tool_result') {
                  if (data.event.tool === 'deep_scrape' || data.event.tool === 'firecrawl_scrape' || data.event.tool === 'web_search') {
                    // Extract screenshots from results
                    // Always add new screenshots even if URL is the same (for multiple scrapes of same page)
                    if (data.event.screenshots) {
                      setScreenshots(prev => [...prev, ...data.event.screenshots])
                    }
                    
                    // Don't clear scraping URL immediately - let it show the screenshot
                    // Only clear when a new tool call happens
                  }
                }
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id
                    ? { ...msg, searchData: { status: 'searching', events: [...events] } }
                    : msg
                ))
              } else if (data.type === 'response') {
                finalContent = data.content
              } else if (data.type === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id
                    ? { 
                        ...msg, 
                        content: finalContent,
                        searchData: { status: 'complete', events: events },
                        sources: searchResults // Keep the sources from this specific search
                      }
                    : msg
                ))
              } else if (data.type === 'error') {
                // Handle SSE error events
                const errorMessage = data.error || data.message || 'An unexpected error occurred during research.';
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id
                    ? { 
                        ...msg, 
                        content: `❌ ${errorMessage}`,
                        searchData: { status: 'error', events: events }
                      }
                    : msg
                ))
              }
            } catch (e) {
              // Error parsing SSE data
            }
          }
        }
      }
    } catch (error) {
      // Search error occurred
      
      let errorMessage = 'Sorry, an error occurred while searching. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('ANTHROPIC_API_KEY')) {
          errorMessage = 'The Anthropic API key is not configured. Please contact the site administrator.'
        } else if (error.message.includes('FIRECRAWL_API_KEY')) {
          errorMessage = 'The Firecrawl API key is not configured. Please contact the site administrator.'
        } else if (error.message.includes('model')) {
          errorMessage = 'The required AI model is not available. This feature may not be accessible in your region.'
        } else if (error.message.includes('beta')) {
          errorMessage = 'The interleaved thinking feature requires special API access. Please contact support.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id
          ? { ...msg, content: errorMessage }
          : msg
      ))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(input)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Parse search results from the tool result text
  const parseSearchResults = (resultText: string) => {
    const results: Array<{ url: string; title: string; description?: string; index?: number; scraped?: boolean; dateFound?: string; markdown?: string }> = []
    const lines = resultText.split('\n')
    let currentResult: { url?: string; title?: string; description?: string; index?: number; scraped?: boolean; dateFound?: string; markdown?: string } | null = null
    
    for (const line of lines) {
      // Match result entries like "[1] Title"
      const titleMatch = line.match(/^\[(\d+)\]\s+(.+)$/)
      if (titleMatch) {
        if (currentResult && currentResult.url && currentResult.title) {
          results.push(currentResult as { url: string; title: string; description?: string })
        }
        currentResult = {
          index: parseInt(titleMatch[1]),
          title: titleMatch[2].replace(' (SCRAPED)', ''),
          scraped: line.includes('(SCRAPED)')
        }
        continue
      }
      
      // Match URL lines
      if (line.startsWith('URL: ') && currentResult) {
        currentResult.url = line.substring(5)
        continue
      }
      
      // Match description lines
      if (line.startsWith('Description: ') && currentResult) {
        currentResult.description = line.substring(13)
        continue
      }
      
      // Match date lines
      if (line.startsWith('Date: ') && currentResult) {
        currentResult.dateFound = line.substring(6)
        continue
      }
      
      // Match content preview
      if (line.startsWith('Content preview: ') && currentResult) {
        currentResult.markdown = line.substring(17)
        continue
      }
    }
    
    // Don't forget the last result
    if (currentResult && currentResult.url && currentResult.title) {
      results.push(currentResult as { url: string; title: string; description?: string })
    }
    
    return results
  }

  const hasMessages = messages.length > 0

  // If no messages, show input below hero section
  if (!hasMessages) {
    return (
      <div className={`w-full max-w-2xl mx-auto mt-4 lg:mt-8 px-4 lg:px-0 transition-all duration-500 ${
        isTransitioning ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'
      }`}>
        <div className="space-y-4 lg:space-y-8">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter query..."
              className="w-full h-12 rounded-full border border-zinc-200 bg-white pl-5 pr-14 text-base text-zinc-900 dark:text-zinc-100 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-orange-400 shadow-sm"
              disabled={isSearching}
            />
            <button
              type="submit"
              disabled={isSearching || !input.trim()}
              className="absolute right-2 top-2 h-8 w-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>

          {showSuggestions && !isSearching && (
            <div className="space-y-2">
              <div className={cn(
                "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400",
                !hasAnimatedSuggestions && "animate-fade-up"
              )} style={{ 
                animationDelay: !hasAnimatedSuggestions ? '200ms' : '0ms',
                opacity: !hasAnimatedSuggestions ? 0 : 1
              }}>
                <span>Try asking:</span>
                <ChevronDown className={cn(
                  "h-3 w-3",
                  !hasAnimatedSuggestions && "animate-bounce"
                )} style={{ animationDelay: !hasAnimatedSuggestions ? '500ms' : '0ms' }} />
              </div>
              <div className="space-y-2">
                {SUGGESTED_QUERIES.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-300 text-sm text-gray-700 dark:text-gray-300 hover:shadow-sm",
                      !hasAnimatedSuggestions && "animate-fade-up"
                    )}
                    style={{ 
                      animationDelay: !hasAnimatedSuggestions ? `${300 + idx * 80}ms` : '0ms',
                      opacity: !hasAnimatedSuggestions ? 0 : 1,
                      transform: 'translateZ(0)' // Force GPU acceleration to prevent cutoff
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Split layout when messages exist
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-2 lg:gap-4 h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)] animate-slide-up pt-2 lg:pt-5">
      {/* Chat interface - Bottom on mobile, Left on desktop */}
      <div className={cn(
        "flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-700 ease-out",
        showFullWidth ? "h-full w-full" : "h-[45vh] lg:h-full lg:w-1/2" // Full height on mobile when browser closed
      )}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-3 lg:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex animate-fade-in",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'user' ? (
                <div className="max-w-[85%] lg:max-w-[80%] bg-orange-500 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg shadow-sm text-sm">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-[90%] space-y-3">
                  {/* Show thinking events if available */}
                  {message.searchData?.events && message.searchData.events.length > 0 && (
                    <div className="space-y-2">
                      {message.searchData.events.map((event, idx) => {
                        const colorClass = "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                        const textColorClass = "text-gray-700 dark:text-gray-300"
                          
                        if (event.type === 'thinking') {
                          return (
                            <div key={idx} className={`px-3 lg:px-4 py-2 lg:py-3 rounded-lg border ${colorClass} max-w-[90%] lg:max-w-[80%]`}>
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className={`text-sm font-medium ${textColorClass} mb-1`}>
                                    Thinking Block #{event.number}
                                  </div>
                                  <div className={`text-sm ${textColorClass} whitespace-pre-wrap`}>
                                    {event.content || ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        if (event.type === 'tool_call') {
                          const isWebSearch = event.tool === 'firecrawl_search' || event.tool === 'web_search'
                          const isDeepScrape = event.tool === 'firecrawl_scrape' || event.tool === 'deep_scrape'
                          return (
                            <div key={idx} className={`px-3 lg:px-4 py-2 rounded-lg border ${colorClass} max-w-[90%] lg:max-w-[80%]`}>
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isWebSearch ? 'bg-purple-500' : isDeepScrape ? 'bg-orange-500' : 'bg-gray-500'} mt-1.5 flex-shrink-0`} />
                                <div className="flex-1">
                                  <div className="text-sm">
                                    <span className={`font-medium ${textColorClass}`}>
                                      {isWebSearch ? 'Web Search' : isDeepScrape ? 'Deep Scrape' : event.tool}
                                    </span>
                                  </div>
                                  {(event as { parameters?: { query?: string } }).parameters?.query && (
                                    <div className={`text-sm ${textColorClass} opacity-80 mt-1`}>
                                      &quot;{(event as { parameters?: { query?: string } }).parameters?.query}&quot;
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        }
                        if (event.type === 'tool_result' && event.result) {
                          const resultPreview = event.result.substring(0, 100)
                          return (
                            <div key={idx} className={`px-3 lg:px-4 py-2 rounded-lg border ${colorClass} max-w-[90%] lg:max-w-[80%]`}>
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className={`font-medium ${textColorClass}`}>
                                      Results Received
                                    </span>
                                    <span className={`text-xs ${textColorClass} opacity-80`}>
                                      {event.duration ? `${(event.duration / 1000).toFixed(1)}s` : ''}
                                    </span>
                                  </div>
                                  <div className={`text-xs ${textColorClass} opacity-80 mt-1 line-clamp-2`}>
                                    {resultPreview}...
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                  
                  {/* Show final response */}
                  {message.content ? (
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <MarkdownRenderer 
                          content={message.content} 
                          sources={message.sources || []}
                        />
                        <CitationTooltip sources={message.sources || []} />
                      </div>
                    </div>
                  ) : isSearching && message.searchData?.status === 'searching' ? (
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg animate-fade-in" style={{ animationDelay: '200ms', opacity: 0 }}>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Researching...
                        </span>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Action buttons for completed responses */}
                  {message.role === 'assistant' && message.content && message.searchData?.status === 'complete' && (
                    <div className="mt-3 flex items-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content)
                        }}
                        className="ml-auto p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area with firesearch style */}
        <div className="p-2 lg:p-3 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter query..."
                className="w-full h-12 rounded-full border border-zinc-200 bg-white pl-5 pr-14 text-base text-zinc-900 dark:text-zinc-100 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-orange-400 shadow-sm"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching || !input.trim()}
                className="absolute right-2 top-2 h-8 w-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Browser/Search Results - Top on mobile, Right on desktop */}
      <div className={cn(
        "transition-all duration-700 ease-out",
        showFullWidth 
          ? "w-0 opacity-0 h-0 overflow-hidden" 
          : "h-[45vh] lg:h-full lg:w-1/2"
      )}>
        <SearchResultsDisplay
          query={currentQuery}
          results={searchResults} // Show only current search results
          isActive={isSearching}
          currentUrl={currentScrapingUrl}
          screenshots={screenshots}
          onClose={() => {
            setShowFullWidth(true)
          }}
        />
      </div>
    </div>
  )
}