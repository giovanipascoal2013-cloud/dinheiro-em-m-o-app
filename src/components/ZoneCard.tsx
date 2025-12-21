import { Star, MapPin, Banknote, Lock, ChevronRight, AlertTriangle } from 'lucide-react';
import { Zone } from '@/types';
import { cn } from '@/lib/utils';

interface ZoneCardProps {
  zone: Zone;
  isSubscribed?: boolean;
  onClick?: () => void;
}

export function ZoneCard({ zone, isSubscribed = false, onClick }: ZoneCardProps) {
  const hasLowScore = zone.reputation_score < 2.5;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer border border-border/50",
        "hover:-translate-y-1 active:scale-[0.99]",
        hasLowScore && "border-warning/50"
      )}
    >
      {/* Low score warning */}
      {hasLowScore && (
        <div className="absolute -top-2 -right-2 bg-warning text-warning-foreground rounded-full p-1.5 shadow-md">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
            {zone.nome}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{zone.cidade}</span>
          </div>
        </div>

        {/* Status indicator */}
        {isSubscribed ? (
          <div className="bg-success/10 text-success text-xs font-medium px-2.5 py-1 rounded-full">
            Subscrito
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground p-2 rounded-lg">
            <Lock className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-4">
        {/* ATM count */}
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Banknote className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{zone.atm_count} ATMs</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "p-1.5 rounded-lg",
            hasLowScore ? "bg-warning/10" : "bg-accent/10"
          )}>
            <Star className={cn(
              "h-4 w-4",
              hasLowScore ? "text-warning" : "text-accent"
            )} />
          </div>
          <span className={cn(
            "text-sm font-medium",
            hasLowScore ? "text-warning" : "text-foreground"
          )}>
            {zone.reputation_score.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            ({zone.likes}/{zone.likes + zone.dislikes})
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div>
          <span className="text-2xl font-bold text-foreground">{zone.price_kz}</span>
          <span className="text-sm text-muted-foreground ml-1">KZ / trimestre</span>
        </div>
        <div className="flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
          {isSubscribed ? 'Acessar' : 'Subscrever'}
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
