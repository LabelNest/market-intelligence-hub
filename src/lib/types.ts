export interface NewsItem {
  id: string;
  source: string;
  url: string;
  title: string;
  published_at: string | null;
  content: string;
  keyword_hits: string[] | null;
  ai_summary: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface NewsStats {
  totalArticles: number;
  processedArticles: number;
  pendingArticles: number;
  sourceBreakdown: Record<string, number>;
  keywordBreakdown: Record<string, number>;
}

export interface NewsFilters {
  sources?: string[];
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
