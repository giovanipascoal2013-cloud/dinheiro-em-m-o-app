import { MapPin, Banknote, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZoneCardData {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  price_kz: number;
  status: string;
  atm_count?: number;
  updated_at?: string;
}

interface ZoneCardProps {
  zone: ZoneCardData;
  isSubscribed?: boolean;
  onClick?: () => void;
  pricePerAtm?: number;
}

export function ZoneCard({ zone, isSubscribed = false, onClick, pricePerAtm = 500 }: ZoneCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer border border-border/50",
        "hover:-translate-y-1 active:scale-[0.99]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
            {zone.name}
          </h3>
          {zone.description && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{zone.description}</span>
            </div>
          )}
        </div>

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
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Banknote className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {zone.atm_count ?? 0} ATMs
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div>
          {zone.price_kz === 0 ? (
            <>
              <span className="text-2xl font-bold text-foreground">
                {(zone.atm_count ?? 0) > 0 ? ((zone.atm_count ?? 0) * pricePerAtm).toLocaleString() : 'Grátis'}
              </span>
              {(zone.atm_count ?? 0) > 0 && <span className="text-sm text-muted-foreground ml-1">KZ / mês</span>}
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-foreground">{zone.price_kz.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground ml-1">KZ / mês</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
          {isSubscribed ? 'Acessar' : 'Subscrever'}
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
