import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NewsFilters as FiltersType } from '@/lib/types';
import { availableSources } from '@/lib/mockData';

interface NewsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

export function NewsFilters({ filters, onFiltersChange }: NewsFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchValue });
  };

  const handleSourceToggle = (source: string) => {
    const currentSources = filters.sources || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status: status === 'all' ? undefined : status });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || filters.status || (filters.sources && filters.sources.length > 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search headlines, content..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-4"
        />
      </form>

      <div className="flex items-center gap-2">
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Sources
              {filters.sources && filters.sources.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {filters.sources.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium">Filter by Source</p>
              <div className="space-y-2">
                {availableSources.map((source) => (
                  <div key={source} className="flex items-center gap-2">
                    <Checkbox
                      id={source}
                      checked={filters.sources?.includes(source) || false}
                      onCheckedChange={() => handleSourceToggle(source)}
                    />
                    <Label htmlFor={source} className="text-sm cursor-pointer">
                      {source}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
