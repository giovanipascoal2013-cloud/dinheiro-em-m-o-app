import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Wallet, 
  Banknote, 
  RefreshCw,
  Users,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  price_kz: number;
  status: string;
}

interface ATM {
  id: string;
  bank_name: string;
  address: string;
  has_cash: boolean;
  last_updated: string;
  zone_id: string;
}

interface SubscriptionAgg {
  zone_id: string;
  total: number;
  expired_amount: number;
  active_amount: number;
}

const AGENT_SHARE = 0.7;

const AgentDashboard = () => {
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [subscriptionAggs, setSubscriptionAggs] = useState<SubscriptionAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAtm, setUpdatingAtm] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get agent's zone IDs
      const { data: agentZones } = await supabase
        .from('agent_zones')
        .select('zone_id')
        .eq('agent_id', user.id);

      const zoneIds = agentZones?.map(az => az.zone_id) ?? [];

      if (zoneIds.length === 0) {
        setZones([]);
        setAtms([]);
        setSubscriptionAggs([]);
        setLoading(false);
        return;
      }

      // 2. Fetch zones, ATMs, subscriptions in parallel
      const [zonesRes, atmsRes, subsRes] = await Promise.all([
        supabase.from('zones').select('id, name, price_kz, status').in('id', zoneIds),
        supabase.from('atms').select('id, bank_name, address, has_cash, last_updated, zone_id').in('zone_id', zoneIds),
        supabase.from('subscriptions').select('zone_id, amount_kz, status, expiry_date').in('zone_id', zoneIds),
      ]);

      setZones(zonesRes.data ?? []);
      setAtms(atmsRes.data ?? []);

      // 3. Aggregate subscriptions per zone
      const subs = subsRes.data ?? [];
      const now = new Date();
      const aggMap = new Map<string, SubscriptionAgg>();

      for (const sub of subs) {
        const existing = aggMap.get(sub.zone_id) || { zone_id: sub.zone_id, total: 0, expired_amount: 0, active_amount: 0 };
        existing.total += 1;
        const amount = Number(sub.amount_kz);
        const isExpired = sub.status === 'expired' || new Date(sub.expiry_date) < now;
        if (isExpired) {
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

  const handleToggleCash = async (atm: ATM) => {
    setUpdatingAtm(atm.id);
    const newStatus = !atm.has_cash;

    const { error } = await supabase
      .from('atms')
      .update({ has_cash: newStatus, last_updated: new Date().toISOString() })
      .eq('id', atm.id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o ATM.', variant: 'destructive' });
    } else {
      setAtms(prev => prev.map(a => a.id === atm.id ? { ...a, has_cash: newStatus, last_updated: new Date().toISOString() } : a));
      toast({ title: 'ATM atualizado', description: `${atm.bank_name} — ${newStatus ? 'Com dinheiro' : 'Sem dinheiro'}` });
    }
    setUpdatingAtm(null);
  };

  const totalSubscriptions = subscriptionAggs.reduce((sum, a) => sum + a.total, 0);
  const availableBalance = subscriptionAggs.reduce((sum, a) => sum + a.expired_amount, 0) * AGENT_SHARE;
  const pendingBalance = subscriptionAggs.reduce((sum, a) => sum + a.active_amount, 0) * AGENT_SHARE;

  if (loading) {
    return (
      <DashboardLayout title="Meu Painel" subtitle="Painel do Agente">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meu Painel" subtitle="Painel do Agente">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={MapPin} label="Zonas" value={zones.length} color="primary" />
        <StatCard icon={Banknote} label="ATMs" value={atms.length} color="accent" />
        <StatCard icon={Users} label="Adesões" value={totalSubscriptions} color="success" />
        <StatCard 
          icon={Wallet} 
          label="Disponível" 
          value={`${Math.round(availableBalance).toLocaleString()} KZ`} 
          color="warning" 
        />
      </div>

      {/* Balance detail */}
      <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-8">
        <h2 className="font-semibold text-foreground mb-4">Saldo</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Saldo disponível (subscrições terminadas × 70%)</span>
            <span className="font-bold text-accent text-lg">{Math.round(availableBalance).toLocaleString()} KZ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Saldo pendente (subscrições activas × 70%)</span>
            <span className="font-semibold text-foreground">{Math.round(pendingBalance).toLocaleString()} KZ</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O saldo pendente só fica disponível após a subscrição expirar.
          </p>
        </div>
      </div>

      {/* Zones with ATMs */}
      <section>
        <h2 className="font-semibold text-foreground mb-4">ATMs por Zona</h2>
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
                <div key={zone.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{zone.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {zoneAgg?.total ?? 0} adesões
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{zoneAtms.length} ATMs · {zone.price_kz.toLocaleString()} KZ/mês</p>

                  <div className="space-y-2">
                    {zoneAtms.map(atm => (
                      <div key={atm.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              atm.has_cash ? "bg-success" : "bg-destructive"
                            )} />
                            <p className="text-sm font-medium text-foreground truncate">{atm.bank_name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{atm.address}</p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn(
                            "text-xs font-medium",
                            atm.has_cash ? "text-success" : "text-destructive"
                          )}>
                            {atm.has_cash ? 'Com $' : 'Sem $'}
                          </span>
                          <Switch
                            checked={atm.has_cash}
                            disabled={updatingAtm === atm.id}
                            onCheckedChange={() => handleToggleCash(atm)}
                          />
                        </div>
                      </div>
                    ))}
                    {zoneAtms.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum ATM nesta zona.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
};

function StatCard({ icon: Icon, label, value, color }: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
      <div className="flex items-center gap-3 mb-2">
        <div className={`bg-${color}/10 p-2 rounded-lg`}>
          <Icon className={`h-4 w-4 text-${color}`} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default AgentDashboard;
