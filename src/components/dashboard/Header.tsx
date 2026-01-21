import { RefreshCw, Download, Sparkles, TrendingUp, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePicker } from './DateRangePicker';

interface HeaderProps {
  onRefresh: () => void;
  onCrawl: () => void;
  onSummarize: () => void;
  onExportNewsRaw: () => void;
  onExportNewsToProcess: () => void;
  isRefreshing?: boolean;
  isCrawling?: boolean;
  isSummarizing?: boolean;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateChange: (start: Date | undefined, end: Date | undefined) => void;
}

export function Header({
  onRefresh,
  onCrawl,
  onSummarize,
  onExportNewsRaw,
  onExportNewsToProcess,
  isRefreshing,
  isCrawling,
  isSummarizing,
  startDate,
  endDate,
  onDateChange,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                Real-time news aggregation and AI-powered insights from 10 sources
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onCrawl}
            disabled={isCrawling || !startDate || !endDate}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isCrawling ? 'animate-spin' : ''}`} />
            {isCrawling ? 'Crawling...' : 'Crawl News'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSummarize}
            disabled={isSummarizing}
            className="gap-2"
          >
            <Sparkles className={`h-4 w-4 ${isSummarizing ? 'animate-pulse' : ''}`} />
            {isSummarizing ? 'Summarizing...' : 'AI Summarize'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportNewsRaw} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export News_raw.csv
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportNewsToProcess} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export News_To_Process.csv
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Date Range:</span>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={onDateChange}
            maxRangeDays={15}
          />
        </div>
        {startDate && endDate && (
          <span className="text-xs text-muted-foreground">
            Crawling articles from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
          </span>
        )}
      </div>
    </header>
  );
}
