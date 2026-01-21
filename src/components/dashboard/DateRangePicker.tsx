import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays, startOfMonth, isAfter, isBefore } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateChange: (start: Date | undefined, end: Date | undefined) => void;
  maxRangeDays?: number;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  maxRangeDays = 15,
}: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  // Minimum date: January 1, 2025
  const minDate = new Date(2025, 0, 1);
  const today = new Date();

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date, endDate);
      
      // If end date is invalid (more than maxRangeDays or before start), adjust it
      if (endDate) {
        const daysDiff = differenceInDays(endDate, date);
        if (daysDiff > maxRangeDays || daysDiff < 0) {
          const newEndDate = addDays(date, maxRangeDays);
          onDateChange(date, isAfter(newEndDate, today) ? today : newEndDate);
        }
      }
    }
    setIsStartOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date && startDate) {
      const daysDiff = differenceInDays(date, startDate);
      if (daysDiff >= 0 && daysDiff <= maxRangeDays) {
        onDateChange(startDate, date);
      }
    }
    setIsEndOpen(false);
  };

  // Calculate disabled dates for end picker
  const getEndDateDisabled = (date: Date) => {
    if (!startDate) return true;
    if (isBefore(date, startDate)) return true;
    if (differenceInDays(date, startDate) > maxRangeDays) return true;
    if (isAfter(date, today)) return true;
    return false;
  };

  // Calculate disabled dates for start picker
  const getStartDateDisabled = (date: Date) => {
    if (isBefore(date, minDate)) return true;
    if (isAfter(date, today)) return true;
    return false;
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'justify-start text-left font-normal gap-2',
              !startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {startDate ? format(startDate, 'MMM dd, yyyy') : 'Start date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleStartDateSelect}
            disabled={getStartDateDisabled}
            defaultMonth={startDate || startOfMonth(new Date(2025, 0, 1))}
            initialFocus
          />
          <div className="p-3 border-t text-xs text-muted-foreground">
            Articles from Jan 2025 onwards
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">to</span>

      <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'justify-start text-left font-normal gap-2',
              !endDate && 'text-muted-foreground'
            )}
            disabled={!startDate}
          >
            <CalendarIcon className="h-4 w-4" />
            {endDate ? format(endDate, 'MMM dd, yyyy') : 'End date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={handleEndDateSelect}
            disabled={getEndDateDisabled}
            defaultMonth={endDate || startDate}
            initialFocus
          />
          <div className="p-3 border-t text-xs text-muted-foreground">
            Max {maxRangeDays} days from start date
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
