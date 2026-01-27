import { useMemo, useState, useCallback, useEffect } from 'react';
import { FileText, CheckCircle2, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { NewsCardsGrid } from '@/components/dashboard/NewsCard';
import { ArticleDetailModal } from '@/components/dashboard/ArticleDetailModal';
import { NewsFilters } from '@/components/dashboard/NewsFilters';
import { SourceBarChart } from '@/components/dashboard/SourceBarChart';
import { KeywordCloud } from '@/components/dashboard/KeywordCloud';
import { useNewsData, NewsFilters as FiltersType } from '@/hooks/useNewsData';
import { NewsItem } from '@/lib/types';
import { toast } from 'sonner';

const Index = () => {
  const [filters, setFilters] = useState<FiltersType>({});
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2025, 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(2025, 0, 15));
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resummarizingId, setResummarizingId] = useState<string | null>(null);

  const {
    newsRaw,
    newsToProcess,
    stats,
    isLoading,
    isCrawling,
    isSummarizing,
    crawlNews,
    summarizeNews,
    refreshAll,
    exportNewsRaw,
    exportNewsToProcess,
  } = useNewsData(filters);

  const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleCrawl = () => {
    if (startDate && endDate) {
      crawlNews({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
    } else {
      toast.error('Please select a date range first');
    }
  };

  const handleSummarize = () => {
    summarizeNews(undefined);
  };

  // Convert newsRaw to NewsItem format for NewsCardsGrid
  const newsItems = useMemo(() => {
    return newsRaw.map(item => ({
      id: item.id,
      source: item.source_name,
      url: item.url,
      title: item.headline,
      published_at: item.published_at,
      content: item.body_text || '',
      keyword_hits: item.ai_keywords,
      ai_summary: item.ai_summary,
      status: item.extraction_status === 'Extracted' ? 'completed' as const : 'pending' as const,
      created_at: item.created_at,
    }));
  }, [newsRaw]);

  const handleArticleClick = useCallback((item: NewsItem) => {
    setSelectedArticle(item);
    setIsModalOpen(true);
  }, []);

  const handleResummarize = useCallback((articleId: string) => {
    setResummarizingId(articleId);
    summarizeNews([articleId]);
  }, [summarizeNews]);

  // Update selected article when newsItems changes (after re-summarization)
  useEffect(() => {
    if (selectedArticle && resummarizingId) {
      const updatedItem = newsItems.find(item => item.id === selectedArticle.id);
      if (updatedItem && updatedItem.ai_summary !== selectedArticle.ai_summary) {
        setSelectedArticle(updatedItem);
        setResummarizingId(null);
      }
    }
  }, [newsItems, selectedArticle, resummarizingId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        <Header
          onRefresh={refreshAll}
          onCrawl={handleCrawl}
          onSummarize={handleSummarize}
          onExportNewsRaw={exportNewsRaw}
          onExportNewsToProcess={exportNewsToProcess}
          isRefreshing={isLoading}
          isCrawling={isCrawling}
          isSummarizing={isSummarizing}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatsCard
            title="Total Articles"
            value={stats.totalArticles}
            subtitle="In news_raw table"
            icon={FileText}
            variant="primary"
          />
          <StatsCard
            title="Extracted"
            value={stats.extractedArticles}
            subtitle="AI summaries generated"
            icon={CheckCircle2}
            variant="success"
          />
          <StatsCard
            title="Pending"
            value={stats.pendingArticles}
            subtitle="Awaiting AI processing"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="To Process"
            value={newsToProcess.length}
            subtitle="Non-matching articles"
            icon={AlertTriangle}
            variant="accent"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <SourceBarChart data={stats.sourceBreakdown} />
          <KeywordCloud data={stats.keywordBreakdown} />
        </div>

        {/* Filters & News Cards */}
        <div className="space-y-4 animate-fade-in">
          <NewsFilters filters={filters} onFiltersChange={setFilters} />
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading articles...</div>
            </div>
          ) : (
            <NewsCardsGrid items={newsItems} onArticleClick={handleArticleClick} />
          )}
        </div>

        {/* Sources Info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                10 News Sources Monitored
              </p>
              <p className="text-sm text-muted-foreground">
                PEI, DealStreetAsia, VCCircle, TechCrunch, Crunchbase News, ET, Moneycontrol, LiveMint, PR Newswire, BusinessWire
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                News frequency: 1-4 hours | Press releases: 4-6 hours | Articles filtered by private market keywords
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onResummarize={handleResummarize}
        isResummarizing={resummarizingId === selectedArticle?.id}
      />
    </div>
  );
};

export default Index;
