import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CardVariant = 'primary' | 'success' | 'warning' | 'accent';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: CardVariant;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const variantStyles: Record<CardVariant, string> = {
  primary: 'gradient-primary',
  success: 'gradient-success',
  warning: 'gradient-warning',
  accent: 'gradient-accent',
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
  trend,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 text-primary-foreground shadow-card transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-sm opacity-80">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium opacity-90">
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="opacity-70">vs last week</span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-primary-foreground/10 p-3 backdrop-blur-sm">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/5" />
    </div>
  );
}
