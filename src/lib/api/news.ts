import { supabase } from '@/integrations/supabase/client';

export interface NewsRawItem {
  id: string;
  url: string;
  source_name: string;
  published_at: string | null;
  headline: string;
  body_text: string | null;
  ai_keywords: string[] | null;
  ai_summary: string | null;
  extraction_status: 'Extracted' | 'Pending';
  created_at: string;
  updated_at: string;
}

export interface NewsToProcessItem {
  id: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
  created_at: string;
}

export interface CrawlResponse {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    total: number;
    withinDateRange: number;
    matching: number;
    nonMatching: number;
  };
}

export interface SummarizeResponse {
  success: boolean;
  message?: string;
  error?: string;
  processed?: number;
  failed?: number;
}

export const newsApi = {
  // Fetch all news_raw articles
  async fetchNewsRaw(options?: {
    sources?: string[];
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<NewsRawItem[]> {
    let query = supabase
      .from('news_raw')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (options?.sources && options.sources.length > 0) {
      query = query.in('source_name', options.sources);
    }

    if (options?.status) {
      query = query.eq('extraction_status', options.status);
    }

    if (options?.search) {
      query = query.or(`headline.ilike.%${options.search}%,body_text.ilike.%${options.search}%`);
    }

    if (options?.startDate) {
      query = query.gte('published_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('published_at', options.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching news_raw:', error);
      throw error;
    }

    return (data || []) as NewsRawItem[];
  },

  // Fetch all news_to_process articles
  async fetchNewsToProcess(): Promise<NewsToProcessItem[]> {
    const { data, error } = await supabase
      .from('news_to_process')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching news_to_process:', error);
      throw error;
    }

    return (data || []) as NewsToProcessItem[];
  },

  // Get stats from database
  async getStats(): Promise<{
    totalArticles: number;
    extractedArticles: number;
    pendingArticles: number;
    sourceBreakdown: Record<string, number>;
    keywordBreakdown: Record<string, number>;
  }> {
    const { data: newsRaw, error } = await supabase
      .from('news_raw')
      .select('source_name, extraction_status, ai_keywords');

    if (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }

    const items = newsRaw || [];
    const sourceBreakdown: Record<string, number> = {};
    const keywordBreakdown: Record<string, number> = {};

    let extractedCount = 0;
    let pendingCount = 0;

    items.forEach((item: any) => {
      // Count by status
      if (item.extraction_status === 'Extracted') {
        extractedCount++;
      } else {
        pendingCount++;
      }

      // Source breakdown
      sourceBreakdown[item.source_name] = (sourceBreakdown[item.source_name] || 0) + 1;

      // Keyword breakdown
      if (item.ai_keywords && Array.isArray(item.ai_keywords)) {
        item.ai_keywords.forEach((keyword: string) => {
          keywordBreakdown[keyword] = (keywordBreakdown[keyword] || 0) + 1;
        });
      }
    });

    return {
      totalArticles: items.length,
      extractedArticles: extractedCount,
      pendingArticles: pendingCount,
      sourceBreakdown,
      keywordBreakdown,
    };
  },

  // Trigger news crawl
  async crawlNews(startDate: string, endDate: string): Promise<CrawlResponse> {
    const { data, error } = await supabase.functions.invoke('crawl-news', {
      body: { startDate, endDate },
    });

    if (error) {
      console.error('Error crawling news:', error);
      return { success: false, error: error.message };
    }

    return data as CrawlResponse;
  },

  // Trigger AI summarization
  async summarizeNews(articleIds?: string[]): Promise<SummarizeResponse> {
    const { data, error } = await supabase.functions.invoke('summarize-news', {
      body: { articleIds, batchSize: 10 },
    });

    if (error) {
      console.error('Error summarizing news:', error);
      return { success: false, error: error.message };
    }

    return data as SummarizeResponse;
  },

  // Export to CSV
  exportToCsv(items: NewsRawItem[] | NewsToProcessItem[], filename: string): void {
    let csvContent: string;

    if ('headline' in (items[0] || {})) {
      // news_raw format
      const headers = ['id', 'URL', 'Source_Name', 'PublishedDate', 'Headline', 'BodyText', 'AI_Keywords', 'AI_Summary', 'Extraction_Status'];
      csvContent = [
        headers.join(','),
        ...(items as NewsRawItem[]).map(item =>
          [
            `"${item.id}"`,
            `"${item.url}"`,
            `"${item.source_name}"`,
            `"${item.published_at || ''}"`,
            `"${(item.headline || '').replace(/"/g, '""')}"`,
            `"${(item.body_text || '').replace(/"/g, '""')}"`,
            `"${(item.ai_keywords || []).join('; ')}"`,
            `"${(item.ai_summary || '').replace(/"/g, '""')}"`,
            `"${item.extraction_status}"`,
          ].join(',')
        ),
      ].join('\n');
    } else {
      // news_to_process format
      const headers = ['id', 'source_name', 'source_url', 'published_at'];
      csvContent = [
        headers.join(','),
        ...(items as NewsToProcessItem[]).map(item =>
          [
            `"${item.id}"`,
            `"${item.source_name}"`,
            `"${item.source_url}"`,
            `"${item.published_at || ''}"`,
          ].join(',')
        ),
      ].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
