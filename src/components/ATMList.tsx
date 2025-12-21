import { Banknote, Clock, MapPin, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { ATM } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ATMListItemProps {
  atm: ATM;
  onReport?: () => void;
}

function getStatusConfig(status: ATM['status_atm']) {
  switch (status) {
    case 'com_dinheiro':
      return {
        label: 'Com dinheiro',
        icon: CheckCircle2,
        className: 'status-available',
        dotColor: 'bg-success',
      };
    case 'sem_dinheiro':
      return {
        label: 'Sem dinheiro',
        icon: AlertCircle,
        className: 'status-unavailable',
        dotColor: 'bg-destructive',
      };
    case 'offline':
      return {
        label: 'Offline',
        icon: WifiOff,
        className: 'status-offline',
        dotColor: 'bg-muted-foreground',
      };
  }
}

export function ATMListItem({ atm, onReport }: ATMListItemProps) {
  const statusConfig = getStatusConfig(atm.status_atm);
  const StatusIcon = statusConfig.icon;
  const lastUpdate = formatDistanceToNow(new Date(atm.last_update_at), { 
    addSuffix: true, 
    locale: pt 
  });

  return (
    <div className="bg-card rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        {/* ATM Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-primary flex-shrink-0" />
            <h4 className="font-semibold text-foreground truncate">{atm.nome}</h4>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{atm.endereco}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            <span>Atualizado {lastUpdate}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ml-3",
          statusConfig.className
        )}>
          <span className={cn("w-2 h-2 rounded-full animate-pulse-soft", statusConfig.dotColor)} />
          {statusConfig.label}
        </div>
      </div>

      {/* Report button */}
      {onReport && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReport();
          }}
          className="mt-3 text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          Reportar erro
        </button>
      )}
    </div>
  );
}

interface ATMListProps {
  atms: ATM[];
  onReportATM?: (atm: ATM) => void;
}

export function ATMList({ atms, onReportATM }: ATMListProps) {
  const sortedATMs = [...atms].sort((a, b) => {
    const order = { com_dinheiro: 0, sem_dinheiro: 1, offline: 2 };
    return order[a.status_atm] - order[b.status_atm];
  });

  return (
    <div className="space-y-3">
      {sortedATMs.map((atm) => (
        <ATMListItem 
          key={atm.id} 
          atm={atm} 
          onReport={onReportATM ? () => onReportATM(atm) : undefined} 
        />
      ))}
    </div>
  );
}
