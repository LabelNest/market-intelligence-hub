import { useMemo, useState, useCallback, useEffect } from 'react';
import { FileText, CheckCircle2, Clock, TrendingUp, AlertTriangle, Zap, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Index = () => {
  const [filters, setFilters] = useState<FiltersType>({});
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 2));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resummarizingId, setResummarizingId] = useState<string | null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const {
    newsRaw,
    newsToProcess,
    stats,
    isLoading,
    isCrawling,
    isSummarizing,
    isDeepScraping,
    crawlNews,
    summarizeNews,
    deepScrapeArticles,
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

  const handleDeepScrape = useCallback(() => {
    if (selectedArticleIds.size === 0) {
      toast.error('Please select articles to deep scrape');
      return;
    }
    if (selectedArticleIds.size > 10) {
      toast.error('Maximum 10 articles can be deep scraped at once');
      return;
    }
    deepScrapeArticles(Array.from(selectedArticleIds));
  }, [selectedArticleIds, deepScrapeArticles]);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    if (isSelectMode) {
      setSelectedArticleIds(new Set());
    }
  }, [isSelectMode]);

  const handleSelectAll = useCallback(() => {
    if (selectedArticleIds.size === newsItems.length) {
      setSelectedArticleIds(new Set());
    } else {
      setSelectedArticleIds(new Set(newsItems.map(item => item.id)));
    }
  }, [newsItems, selectedArticleIds.size]);

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
          <div className="flex items-center justify-between">
            <NewsFilters filters={filters} onFiltersChange={setFilters} />
            <div className="flex items-center gap-2">
              {isSelectMode && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedArticleIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedArticleIds.size === newsItems.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeepScrape}
                    disabled={isDeepScraping || selectedArticleIds.size === 0}
                    className="gap-2 gradient-primary"
                  >
                    <Zap className={`h-4 w-4 ${isDeepScraping ? 'animate-pulse' : ''}`} />
                    {isDeepScraping ? 'Scraping...' : `Deep Scrape (${selectedArticleIds.size})`}
                  </Button>
                </>
              )}
              <Button
                variant={isSelectMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectMode}
                className="gap-2"
              >
                {isSelectMode ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Deep Scrape
                  </>
                )}
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading articles...</div>
            </div>
          ) : (
            <NewsCardsGrid 
              items={newsItems} 
              onArticleClick={handleArticleClick}
              selectedIds={selectedArticleIds}
              onSelectionChange={setSelectedArticleIds}
              showSelection={isSelectMode}
            />
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
