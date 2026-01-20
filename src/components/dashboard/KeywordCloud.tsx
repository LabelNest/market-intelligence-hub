import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KeywordCloudProps {
  data: Record<string, number>;
}

export function KeywordCloud({ data }: KeywordCloudProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...entries.map(([, count]) => count));

  const getSize = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return 'text-lg font-semibold';
    if (ratio > 0.5) return 'text-base font-medium';
    return 'text-sm';
  };

  const getVariant = (index: number): 'default' | 'secondary' | 'outline' => {
    if (index < 2) return 'default';
    if (index < 5) return 'secondary';
    return 'outline';
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Trending Keywords</h3>
      <div className="flex flex-wrap gap-2">
        {entries.map(([keyword, count], index) => (
          <Badge
            key={keyword}
            variant={getVariant(index)}
            className={cn('cursor-default transition-transform hover:scale-105', getSize(count))}
          >
            {keyword}
            <span className="ml-1.5 text-xs opacity-70">({count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
