import { format } from 'date-fns';
import { ExternalLink, Sparkles, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewsCardProps {
  item: NewsItem;
  onClick?: () => void;
}

const statusConfig: Record<string, { icon: React.ElementType; className: string }> = {
  completed: { icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  pending: { icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  processing: { icon: Loader2, className: 'bg-info/10 text-info border-info/20' },
  failed: { icon: AlertCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function NewsCard({ item, onClick }: NewsCardProps) {
  const status = statusConfig[item.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div
      className="group rounded-xl border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-lg hover:border-primary/30 animate-fade-in cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <Badge variant="secondary" className="font-medium shrink-0">
          {item.source}
        </Badge>
        <Badge className={cn('border font-normal shrink-0', status.className)}>
          <StatusIcon className={cn('h-3 w-3 mr-1', item.status === 'processing' && 'animate-spin')} />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {item.title}
      </h3>

      {/* Content Preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {item.content}
      </p>

      {/* AI Summary */}
      {item.ai_summary && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 mb-4">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI Summary
            </p>
            <p className="text-sm text-foreground leading-relaxed line-clamp-3">
              {item.ai_summary}
            </p>
          </div>
        </div>
      )}

      {/* Keywords */}
      {item.keyword_hits && item.keyword_hits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.keyword_hits.slice(0, 4).map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {item.keyword_hits.length > 4 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{item.keyword_hits.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {item.published_at
            ? format(new Date(item.published_at), 'MMM d, yyyy • HH:mm')
            : 'Date unknown'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-muted-foreground hover:text-primary"
          asChild
        >
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Read
          </a>
        </Button>
      </div>
    </div>
  );
}

interface NewsCardsGridProps {
  items: NewsItem[];
  isLoading?: boolean;
  onArticleClick?: (item: NewsItem) => void;
}

export function NewsCardsGrid({ items, isLoading, onArticleClick }: NewsCardsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-card animate-pulse">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-20 bg-muted rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="h-6 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted rounded mb-4" />
            <div className="h-20 w-full bg-muted rounded mb-4" />
            <div className="flex gap-1">
              <div className="h-5 w-16 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center shadow-card">
        <p className="text-muted-foreground">No news articles found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} onClick={() => onArticleClick?.(item)} />
      ))}
    </div>
  );
}
