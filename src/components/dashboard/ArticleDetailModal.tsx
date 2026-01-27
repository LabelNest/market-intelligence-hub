import { format } from 'date-fns';
import { ExternalLink, Sparkles, RefreshCw, X, Calendar, Link2, Tag } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ArticleDetailModalProps {
  article: NewsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResummarize: (articleId: string) => void;
  isResummarizing?: boolean;
}

export function ArticleDetailModal({
  article,
  open,
  onOpenChange,
  onResummarize,
  isResummarizing,
}: ArticleDetailModalProps) {
  if (!article) return null;

  const handleResummarize = () => {
    onResummarize(article.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 bg-card">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-medium">
                {article.source}
              </Badge>
              <Badge
                className={cn(
                  'border font-normal',
                  article.status === 'completed'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                )}
              >
                {article.status === 'completed' ? 'Extracted' : 'Pending'}
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold leading-tight text-foreground pr-8">
            {article.title}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {article.published_at
                ? format(new Date(article.published_at), 'MMMM d, yyyy • HH:mm')
                : 'Date unknown'}
            </span>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="px-6 py-5 space-y-6">
            {/* AI Summary Section */}
            {article.ai_summary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    AI Summary
                  </h3>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {article.ai_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Full Content Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Article Content
              </h3>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {article.content || 'No content available. Click the source link to read the full article.'}
                </p>
              </div>
            </div>

            {/* Keywords Section */}
            {article.keyword_hits && article.keyword_hits.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Keywords
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.keyword_hits.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-sm">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source Link Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Source
                </h3>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline break-all"
              >
                {article.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer Actions */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResummarize}
            disabled={isResummarizing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isResummarizing && 'animate-spin')} />
            {isResummarizing ? 'Summarizing...' : 'Re-summarize'}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Source
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
