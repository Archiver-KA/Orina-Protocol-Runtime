/**
 * Tavily Search API Client — web search for ORINA Product Sourcing.
 * API: https://api.tavily.com/search
 * Pattern: concurrent multi-query with deduplication (matches NVIDIA blog ReAct pattern)
 */

interface TavilySearchOptions {
  topic?: 'general' | 'news' | 'finance';
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeImages?: boolean;
  timeoutMs?: number;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  rawContent?: string;
}

interface TavilySuccess {
  success: true;
  results: TavilyResult[];
  query: string;
}

interface TavilyFailure {
  success: false;
  error: string;
  query: string;
}

export type TavilySearchResult = TavilySuccess | TavilyFailure;

/**
 * Single Tavily search. Never throws — returns { success: false } on error.
 */
export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {},
): Promise<TavilySearchResult> {
  const apiKey = Deno.env.get("TAVILY_API_KEY");
  if (!apiKey) {
    return { success: false, error: "TAVILY_API_KEY not configured", query };
  }

  const {
    topic = 'general',
    searchDepth = 'basic',
    maxResults = 5,
    includeImages = true,
    timeoutMs = 15000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic,
        search_depth: searchDepth,
        max_results: maxResults,
        include_images: includeImages,
        include_answer: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return { success: false, error: `Tavily API ${response.status}: ${errorText}`, query };
    }

    const data = await response.json();
    const results: TavilyResult[] = (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || '',
      score: r.score || 0,
      rawContent: r.raw_content,
    }));

    return { success: true, results, query };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: `Tavily timeout after ${timeoutMs}ms`, query };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error", query };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Concurrent multi-query search with deduplication.
 * Runs up to 5 queries in parallel, deduplicates by URL.
 */
export async function searchTavilyConcurrent(
  queries: string[],
  options: TavilySearchOptions = {},
): Promise<{ results: TavilyResult[]; queriesRun: number; errors: string[] }> {
  const limited = queries.slice(0, 5);
  const settled = await Promise.allSettled(
    limited.map(q => searchTavily(q, options))
  );

  const allResults: TavilyResult[] = [];
  const errors: string[] = [];
  const seenUrls = new Set<string>();

  for (const s of settled) {
    if (s.status === 'rejected') {
      errors.push(String(s.reason));
      continue;
    }
    const r = s.value;
    if (!r.success) {
      errors.push(`[${r.query}] ${r.error}`);
      continue;
    }
    for (const item of r.results) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allResults.push(item);
      }
    }
  }

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  return { results: allResults, queriesRun: limited.length, errors };
}
