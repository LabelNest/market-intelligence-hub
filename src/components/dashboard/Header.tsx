import { RefreshCw, Download, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface HeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
}

export function Header({ onRefresh, onExport, isRefreshing }: HeaderProps) {
  const handleCrawl = () => {
    toast.info('Crawl feature requires Lovable Cloud to be enabled', {
      description: 'Enable Cloud backend to use crawl functionality',
    });
  };

  const handleSummarize = () => {
    toast.info('AI Summarization requires Lovable Cloud to be enabled', {
      description: 'Enable Cloud backend to use AI summarization',
    });
  };

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="rounded-lg gradient-primary p-2">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Private Market Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time news aggregation and AI-powered insights
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCrawl}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Crawl News
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSummarize}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Summarize
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>

        <Button
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </header>
  );
}
