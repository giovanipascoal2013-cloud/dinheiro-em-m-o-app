import { useState, useEffect } from 'react';
import { 
  MapPin, Wallet, Banknote, Users, Clock, Loader2, FileText, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardHint } from '@/components/DashboardHint';
import { ReferralShare } from '@/components/ReferralShare';
import { Switch } from '@/components/ui/switch';
import { WithdrawalModal } from '@/components/WithdrawalModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Zone { id: string; name: string; price_kz: number; status: string; }
interface ATM { 
  id: string; bank_name: string; address: string; has_cash: boolean; 
  has_paper: boolean | null; fila: string | null; status: string | null;
  obs: string | null; last_updated: string; zone_id: string; 
}
interface SubscriptionAgg { zone_id: string; total: number; expired_amount: number; active_amount: number; }
interface AgentZoneRef { zone_id: string; referral_code: string; }

const AGENT_SHARE = 0.7;

const AgentDashboard = () => {
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [subscriptionAggs, setSubscriptionAggs] = useState<SubscriptionAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAtm, setUpdatingAtm] = useState<string | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agentZones } = await supabase.from('agent_zones').select('zone_id').eq('agent_id', user.id);
      const zoneIds = agentZones?.map(az => az.zone_id) ?? [];

      if (zoneIds.length === 0) {
        setZones([]); setAtms([]); setSubscriptionAggs([]); setLoading(false); return;
      }

      const [zonesRes, atmsRes, subsRes, withdrawalsRes] = await Promise.all([
        supabase.from('zones').select('id, name, price_kz, status').in('id', zoneIds),
        supabase.from('atms').select('id, bank_name, address, has_cash, has_paper, fila, status, obs, last_updated, zone_id').in('zone_id', zoneIds),
        supabase.from('subscriptions').select('zone_id, amount_kz, status, expiry_date, created_at').in('zone_id', zoneIds).in('status', ['active', 'expired']),
        supabase.from('withdrawals').select('amount_kz, status').eq('agent_id', user.id),
      ]);

      setZones(zonesRes.data ?? []);
      setAtms(atmsRes.data as ATM[] ?? []);

      const withdrawn = (withdrawalsRes.data ?? [])
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + Number(w.amount_kz), 0);
      setTotalWithdrawn(withdrawn);

      const subs = subsRes.data ?? [];
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const aggMap = new Map<string, SubscriptionAgg>();
      for (const sub of subs) {
        const existing = aggMap.get(sub.zone_id) || { zone_id: sub.zone_id, total: 0, expired_amount: 0, active_amount: 0 };
        existing.total += 1;
        const amount = Number(sub.amount_kz);
        const createdAt = new Date(sub.created_at);
        if (createdAt < oneMonthAgo) {
          existing.expired_amount += amount;
        } else {
          existing.active_amount += amount;
        }
        aggMap.set(sub.zone_id, existing);
      }
      setSubscriptionAggs(Array.from(aggMap.values()));
    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAtm = async (atmId: string, updates: Partial<ATM>) => {
    setUpdatingAtm(atmId);
    const { error } = await supabase.from('atms').update({
      ...updates,
      last_updated: new Date().toISOString(),
    }).eq('id', atmId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o ATM.', variant: 'destructive' });
    } else {
      setAtms(prev => prev.map(a => a.id === atmId ? { ...a, ...updates, last_updated: new Date().toISOString() } : a));
      toast({ title: 'ATM atualizado' });
    }
    setUpdatingAtm(null);
  };

  const handleSaveObs = async (atmId: string) => {
    await handleUpdateAtm(atmId, { obs: obsText || null } as any);
    setEditingObs(null);
  };

  const totalSubscriptions = subscriptionAggs.reduce((sum, a) => sum + a.total, 0);
  const grossAvailable = subscriptionAggs.reduce((sum, a) => sum + a.expired_amount, 0) * AGENT_SHARE;
  const availableBalance = Math.max(0, grossAvailable - totalWithdrawn);
  const pendingBalance = subscriptionAggs.reduce((sum, a) => sum + a.active_amount, 0) * AGENT_SHARE;

  if (loading) {
    return (
      <DashboardLayout title="Meu Painel" subtitle="Painel do Agente">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meu Painel" subtitle="Painel do Agente">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={MapPin} label="Zonas" value={zones.length} color="primary" />
        <StatCard icon={Banknote} label="ATMs" value={atms.length} color="accent" />
        <StatCard icon={Users} label="Adesões" value={totalSubscriptions} color="success" />
        <button onClick={() => availableBalance > 0 && setShowWithdrawal(true)} className="text-left">
          <StatCard icon={Wallet} label="Disponível" value={`${Math.round(availableBalance).toLocaleString()} KZ`} color="warning" clickable={availableBalance > 0} />
        </button>
      </div>

      {/* Balance detail */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-6">
        <h2 className="font-semibold text-foreground mb-3 text-sm">Saldo</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Disponível para levantamento</span>
            <span className="font-bold text-accent">{Math.round(availableBalance).toLocaleString()} KZ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Pendente (disponível após 1 mês)</span>
            <span className="font-semibold text-foreground">{Math.round(pendingBalance).toLocaleString()} KZ</span>
          </div>
        </div>
      </div>

      {/* Zones with ATMs */}
      <section>
        <h2 className="font-semibold text-foreground mb-4 text-sm">ATMs por Zona</h2>
        {zones.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center border border-border/50">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma zona atribuída.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map(zone => {
              const zoneAtms = atms.filter(a => a.zone_id === zone.id);
              const zoneAgg = subscriptionAggs.find(a => a.zone_id === zone.id);
              return (
                <div key={zone.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground text-sm">{zone.name}</h3>
                    <span className="text-xs text-muted-foreground">{zoneAgg?.total ?? 0} adesões</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{zoneAtms.length} ATMs · {zone.price_kz.toLocaleString()} KZ/mês</p>
                  <div className="space-y-3">
                    {zoneAtms.map(atm => (
                      <ATMCard 
                        key={atm.id} 
                        atm={atm} 
                        updating={updatingAtm === atm.id}
                        editingObs={editingObs === atm.id}
                        obsText={editingObs === atm.id ? obsText : ''}
                        onToggleCash={() => handleUpdateAtm(atm.id, { has_cash: !atm.has_cash })}
                        onTogglePaper={() => handleUpdateAtm(atm.id, { has_paper: !atm.has_paper })}
                        onChangeFila={(fila) => handleUpdateAtm(atm.id, { fila } as any)}
                        onChangeStatus={(status) => handleUpdateAtm(atm.id, { status } as any)}
                        onStartEditObs={() => { setEditingObs(atm.id); setObsText(atm.obs || ''); }}
                        onObsTextChange={setObsText}
                        onSaveObs={() => handleSaveObs(atm.id)}
                        onCancelObs={() => setEditingObs(null)}
                      />
                    ))}
                    {zoneAtms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ATM nesta zona.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <WithdrawalModal
        isOpen={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        availableBalance={availableBalance}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
};

function ATMCard({ atm, updating, editingObs, obsText, onToggleCash, onTogglePaper, onChangeFila, onChangeStatus, onStartEditObs, onObsTextChange, onSaveObs, onCancelObs }: {
  atm: ATM;
  updating: boolean;
  editingObs: boolean;
  obsText: string;
  onToggleCash: () => void;
  onTogglePaper: () => void;
  onChangeFila: (v: string | null) => void;
  onChangeStatus: (v: string) => void;
  onStartEditObs: () => void;
  onObsTextChange: (v: string) => void;
  onSaveObs: () => void;
  onCancelObs: () => void;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", 
              atm.status === 'Fora de Serviço' ? 'bg-muted-foreground' : atm.has_cash ? "bg-success" : "bg-destructive")} />
            <p className="text-sm font-semibold text-foreground truncate">{atm.bank_name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{atm.address}</p>
        </div>
      </div>

      {/* Last update */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Atualizado: {format(new Date(atm.last_updated), 'dd/MM/yyyy HH:mm', { locale: pt })}</span>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Dinheiro</span>
          </div>
          <Switch checked={atm.has_cash} disabled={updating} onCheckedChange={onToggleCash} />
        </div>
        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Papel</span>
          </div>
          <Switch checked={!!atm.has_paper} disabled={updating} onCheckedChange={onTogglePaper} />
        </div>
      </div>

      {/* Fila + Status */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={atm.fila || 'none'} onValueChange={(v) => onChangeFila(v === 'none' ? null : v)} disabled={updating}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Fila" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem info fila</SelectItem>
            <SelectItem value="Pouca Gente ( 0 - 6 )">Pouca (0-6)</SelectItem>
            <SelectItem value="Moderado (7 - 13)">Moderado (7-13)</SelectItem>
            <SelectItem value="Muita Gente (+14)">Muita (+14)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={atm.status || 'Operacional'} onValueChange={onChangeStatus} disabled={updating}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Operacional">Operacional</SelectItem>
            <SelectItem value="Sob Manutenção">Manutenção</SelectItem>
            <SelectItem value="Fora de Serviço">Fora de Serviço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Observations */}
      {editingObs ? (
        <div className="space-y-2">
          <Textarea 
            value={obsText} 
            onChange={(e) => onObsTextChange(e.target.value)} 
            placeholder="Observações..." 
            className="text-xs min-h-[60px]"
          />
          <div className="flex gap-2">
            <button onClick={onSaveObs} className="text-xs text-primary font-medium">Guardar</button>
            <button onClick={onCancelObs} className="text-xs text-muted-foreground">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={onStartEditObs} className="w-full text-left">
          {atm.obs ? (
            <p className="text-xs text-muted-foreground bg-background rounded px-2 py-1.5">📝 {atm.obs}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">+ Adicionar observação</p>
          )}
        </button>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, clickable }: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  clickable?: boolean;
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <div className={cn(
      "bg-card rounded-xl p-3 shadow-card border border-border/50",
      clickable && "hover:border-primary/50 cursor-pointer transition-colors ring-1 ring-primary/20"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-lg", colorMap[color] || colorMap.primary)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {clickable && <p className="text-xs text-primary mt-0.5">Clique para levantar</p>}
    </div>
  );
}

export default AgentDashboard;
