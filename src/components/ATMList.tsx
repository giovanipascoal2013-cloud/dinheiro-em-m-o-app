import { Banknote, Clock, MapPin, CheckCircle2, AlertTriangle, WrenchIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ATMData {
  id: string;
  bank_name: string;
  address: string;
  latitude: number;
  longitude: number;
  has_cash: boolean;
  has_paper?: boolean | null;
  last_updated: string;
  cidade?: string | null;
  fila?: string | null;
  status?: string | null;
}

function getStatusConfig(status: string | null | undefined) {
  switch (status) {
    case 'Sob Manutenção':
      return { label: 'Sob Manutenção', icon: WrenchIcon, className: 'bg-warning/10 text-warning', dotColor: 'bg-warning' };
    case 'Fora de Serviço':
      return { label: 'Fora de Serviço', icon: AlertTriangle, className: 'bg-destructive/10 text-destructive', dotColor: 'bg-destructive' };
    default:
      return { label: 'Operacional', icon: CheckCircle2, className: 'bg-success/10 text-success', dotColor: 'bg-success' };
  }
}

export function ATMListItem({ atm }: { atm: ATMData }) {
  const statusConfig = getStatusConfig(atm.status);
  const StatusIcon = statusConfig.icon;
  const lastUpdate = formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt });

  return (
    <div className="bg-card rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className={cn("h-4 w-4 flex-shrink-0", atm.has_cash ? "text-success" : "text-destructive")} />
            <h4 className="font-semibold text-foreground truncate">{atm.bank_name}</h4>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-1">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{atm.address}</span>
          </div>
          {atm.cidade && (
            <p className="text-xs text-muted-foreground mb-1">{atm.cidade}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdate}
            </span>
            {atm.fila && <span>Fila: {atm.fila}</span>}
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Papel: {atm.has_paper ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", statusConfig.className)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            atm.has_cash ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {atm.has_cash ? 'Com dinheiro' : 'Sem dinheiro'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ATMList({ atms }: { atms: ATMData[] }) {
  const sorted = [...atms].sort((a, b) => {
    const order: Record<string, number> = { 'Operacional': 0, 'Sob Manutenção': 1, 'Fora de Serviço': 2 };
    return (order[a.status || 'Operacional'] || 0) - (order[b.status || 'Operacional'] || 0);
  });

  return (
    <div className="space-y-3">
      {sorted.map((atm) => (
        <ATMListItem key={atm.id} atm={atm} />
      ))}
    </div>
  );
}
