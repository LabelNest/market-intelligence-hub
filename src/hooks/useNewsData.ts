import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsApi, NewsRawItem, NewsToProcessItem } from '@/lib/api/news';
import { toast } from 'sonner';

export interface NewsFilters {
  sources?: string[];
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useNewsData(filters: NewsFilters = {}) {
  const queryClient = useQueryClient();

  // Fetch news_raw data
  const {
    data: newsRaw = [],
    isLoading: isLoadingNews,
    refetch: refetchNews,
  } = useQuery({
    queryKey: ['news_raw', filters],
    queryFn: () => newsApi.fetchNewsRaw(filters),
    staleTime: 30000, // 30 seconds
  });

  // Fetch news_to_process data
  const {
    data: newsToProcess = [],
    isLoading: isLoadingToProcess,
    refetch: refetchToProcess,
  } = useQuery({
    queryKey: ['news_to_process'],
    queryFn: () => newsApi.fetchNewsToProcess(),
    staleTime: 30000,
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['news_stats'],
    queryFn: () => newsApi.getStats(),
    staleTime: 30000,
  });

  // Crawl mutation
  const crawlMutation = useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      newsApi.crawlNews(startDate, endDate),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Crawl completed successfully');
        queryClient.invalidateQueries({ queryKey: ['news_raw'] });
        queryClient.invalidateQueries({ queryKey: ['news_to_process'] });
        queryClient.invalidateQueries({ queryKey: ['news_stats'] });
      } else {
        toast.error(data.error || 'Crawl failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Crawl failed: ${error.message}`);
    },
  });

  // Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: (articleIds?: string[]) => newsApi.summarizeNews(articleIds),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Summarization completed');
        queryClient.invalidateQueries({ queryKey: ['news_raw'] });
        queryClient.invalidateQueries({ queryKey: ['news_stats'] });
      } else {
        toast.error(data.error || 'Summarization failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Summarization failed: ${error.message}`);
    },
  });

  // Deep scrape mutation
  const deepScrapeMutation = useMutation({
    mutationFn: (articleIds: string[]) => newsApi.deepScrapeArticles(articleIds),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Deep scrape completed');
        queryClient.invalidateQueries({ queryKey: ['news_raw'] });
      } else {
        toast.error(data.error || 'Deep scrape failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Deep scrape failed: ${error.message}`);
    },
  });

  const refreshAll = useCallback(() => {
    refetchNews();
    refetchToProcess();
    refetchStats();
  }, [refetchNews, refetchToProcess, refetchStats]);

  const exportNewsRaw = useCallback(() => {
    if (newsRaw.length > 0) {
      newsApi.exportToCsv(newsRaw, 'News_raw.csv');
      toast.success('News_raw.csv exported successfully');
    } else {
      toast.info('No data to export');
    }
  }, [newsRaw]);

  const exportNewsToProcess = useCallback(() => {
    if (newsToProcess.length > 0) {
      newsApi.exportToCsv(newsToProcess, 'News_To_Process.csv');
      toast.success('News_To_Process.csv exported successfully');
    } else {
      toast.info('No data to export');
    }
  }, [newsToProcess]);

  return {
    newsRaw,
    newsToProcess,
    stats: stats || {
      totalArticles: 0,
      extractedArticles: 0,
      pendingArticles: 0,
      sourceBreakdown: {},
      keywordBreakdown: {},
    },
    isLoading: isLoadingNews || isLoadingToProcess || isLoadingStats,
    isCrawling: crawlMutation.isPending,
    isSummarizing: summarizeMutation.isPending,
    isDeepScraping: deepScrapeMutation.isPending,
    crawlNews: crawlMutation.mutate,
    summarizeNews: summarizeMutation.mutate,
    deepScrapeArticles: deepScrapeMutation.mutate,
    refreshAll,
    exportNewsRaw,
    exportNewsToProcess,
  };
}
