import { useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface NewsTableProps {
  items: NewsItem[];
  isLoading?: boolean;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  processing: 'bg-info/10 text-info border-info/20 animate-pulse-subtle',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

function NewsRow({ item }: { item: NewsItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group transition-colors hover:bg-muted/50">
        <TableCell className="max-w-md">
          <CollapsibleTrigger asChild>
            <button className="flex items-start gap-2 text-left">
              <span className="mt-1 text-muted-foreground transition-transform duration-200">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
              <span className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-normal">
            {item.source}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {item.published_at
            ? format(new Date(item.published_at), 'MMM d, yyyy HH:mm')
            : '—'}
        </TableCell>
        <TableCell>
          <Badge className={cn('border font-normal', statusStyles[item.status])}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </TableCell>
        <TableCell className="flex flex-wrap gap-1">
          {item.keyword_hits?.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {item.keyword_hits && item.keyword_hits.length > 3 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{item.keyword_hits.length - 3}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            asChild
          >
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={6} className="bg-muted/30 px-6 py-4">
            <div className="space-y-3 animate-fade-in">
              {item.ai_summary ? (
                <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      AI Summary
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.ai_summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>AI summary pending...</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.content}
              </p>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function NewsTable({ items, isLoading }: NewsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-8 text-center text-muted-foreground">
          Loading news items...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[40%]">Headline</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Keywords</TableHead>
            <TableHead className="w-[60px]">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <NewsRow key={item.id} item={item} />
          ))}
        </TableBody>
      </Table>
      {items.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No news items found
        </div>
      )}
    </div>
  );
}
