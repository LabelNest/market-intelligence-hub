import { useMemo, useState } from 'react';
import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { NewsCardsGrid } from '@/components/dashboard/NewsCard';
import { NewsFilters } from '@/components/dashboard/NewsFilters';
import { SourceBarChart } from '@/components/dashboard/SourceBarChart';
import { KeywordCloud } from '@/components/dashboard/KeywordCloud';
import { mockNewsItems, mockStats } from '@/lib/mockData';
import { NewsFilters as FiltersType } from '@/lib/types';
import { toast } from 'sonner';

const Index = () => {
  const [filters, setFilters] = useState<FiltersType>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    let items = [...mockNewsItems];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.content.toLowerCase().includes(search)
      );
    }

    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    if (filters.sources && filters.sources.length > 0) {
      items = items.filter((item) => filters.sources!.includes(item.source));
    }

    return items;
  }, [filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const handleExport = () => {
    // Generate CSV from mock data
    const headers = ['URL', 'Source', 'Published Date', 'Headline', 'AI Summary', 'Status'];
    const csvContent = [
      headers.join(','),
      ...mockNewsItems.map((item) =>
        [
          `"${item.url}"`,
          `"${item.source}"`,
          `"${item.published_at || ''}"`,
          `"${item.title.replace(/"/g, '""')}"`,
          `"${(item.ai_summary || '').replace(/"/g, '""')}"`,
          `"${item.status}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'news-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        <Header
          onRefresh={handleRefresh}
          onExport={handleExport}
          isRefreshing={isRefreshing}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatsCard
            title="Total Articles"
            value={mockStats.totalArticles}
            subtitle="Across all sources"
            icon={FileText}
            variant="primary"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Processed"
            value={mockStats.processedArticles}
            subtitle="AI summaries generated"
            icon={CheckCircle2}
            variant="success"
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatsCard
            title="Pending"
            value={mockStats.pendingArticles}
            subtitle="Awaiting processing"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="Processing Rate"
            value={`${Math.round((mockStats.processedArticles / mockStats.totalArticles) * 100)}%`}
            subtitle="Completion rate"
            icon={TrendingUp}
            variant="accent"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <SourceBarChart data={mockStats.sourceBreakdown} />
          <KeywordCloud data={mockStats.keywordBreakdown} />
        </div>

        {/* Filters & News Cards */}
        <div className="space-y-4 animate-fade-in">
          <NewsFilters filters={filters} onFiltersChange={setFilters} />
          <NewsCardsGrid items={filteredItems} />
        </div>

        {/* Backend Notice */}
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-warning/10 p-2">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Backend Features Require Lovable Cloud
              </p>
              <p className="text-sm text-muted-foreground">
                To enable live news crawling, AI summarization, and persistent data storage, 
                please enable Lovable Cloud in Connectors → Lovable Cloud → Tool Permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
