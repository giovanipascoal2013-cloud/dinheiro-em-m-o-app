import { User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AccountType = 'user' | 'agent';

interface Props {
  value: AccountType;
  onChange: (v: AccountType) => void;
}

export function AccountTypeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Tipo de conta</label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('user')}
          className={cn(
            "p-4 rounded-xl border text-left transition-all",
            value === 'user'
              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          <User className={cn("h-6 w-6 mb-2", value === 'user' ? "text-primary" : "text-muted-foreground")} />
          <p className="font-semibold text-foreground text-sm">Sou Cliente</p>
          <p className="text-xs text-muted-foreground mt-0.5">Quero consultar ATMs com dinheiro</p>
        </button>
        <button
          type="button"
          onClick={() => onChange('agent')}
          className={cn(
            "p-4 rounded-xl border text-left transition-all",
            value === 'agent'
              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          <Briefcase className={cn("h-6 w-6 mb-2", value === 'agent' ? "text-primary" : "text-muted-foreground")} />
          <p className="font-semibold text-foreground text-sm">Sou Agente</p>
          <p className="text-xs text-muted-foreground mt-0.5">Quero registar ATMs e ganhar</p>
        </button>
      </div>
    </div>
  );
}