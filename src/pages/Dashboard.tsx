import { useEffect, useState } from 'react';
import { 
  MapPin, 
  Banknote, 
  Users, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  BarChart3,
  ClipboardCheck,
  Megaphone
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardHint } from '@/components/DashboardHint';
import { OnboardingGuide, OnboardingStep } from '@/components/OnboardingGuide';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { usePricePerAtm } from '@/hooks/usePricePerAtm';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalZones: number;
  activeZones: number;
  totalAtms: number;
  atmsWithCash: number;
  atmsWithoutCash: number;
  atmsOffline: number;
  totalAgents: number;
  totalSubscriptions: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  type: 'atm_update' | 'new_subscription' | 'new_zone';
  description: string;
  timestamp: string;
}

export default function Dashboard() {
  const { isAdmin, isSupervisor, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalZones: 0,
    activeZones: 0,
    totalAtms: 0,
    atmsWithCash: 0,
    atmsWithoutCash: 0,
    atmsOffline: 0,
    totalAgents: 0,
    totalSubscriptions: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [zonesRes, atmsRes, agentRes, subsRes] = await Promise.all([
        supabase.from('zones').select('id, status'),
        supabase.from('atms').select('id, has_cash, status'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
        supabase.from('subscriptions').select('amount_kz').eq('status', 'active'),
      ]);

      const zones = zonesRes.data || [];
      const atms = atmsRes.data || [];
      const revenue = (subsRes.data || []).reduce((sum, s) => sum + Number(s.amount_kz), 0);

      setStats({
        totalZones: zones.length,
        activeZones: zones.filter(z => z.status === 'active').length,
        totalAtms: atms.length,
        atmsWithCash: atms.filter(a => a.has_cash).length,
        atmsWithoutCash: atms.filter(a => !a.has_cash).length,
        atmsOffline: atms.filter(a => a.status === 'Fora de Serviço').length,
        totalAgents: agentRes.count || 0,
        totalSubscriptions: subsRes.data?.length || 0,
        revenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabel = isAdmin ? 'Administrador' : isSupervisor ? 'Supervisor' : 'Agente';

  const supervisorOnboardingSteps: OnboardingStep[] = [
    { title: 'Bem-vindo, Supervisor!', description: 'Gere zonas, ATMs e agentes. O seu trabalho é garantir que a plataforma funciona bem e gera receita para todos.', icon: <BarChart3 className="h-8 w-8 text-primary" /> },
    { title: 'Gestão de Zonas e ATMs', description: 'Crie zonas em áreas com alta concentração de ATMs. Atribua agentes estrategicamente — agentes próximos respondem mais rápido.', icon: <MapPin className="h-8 w-8 text-primary" /> },
    { title: 'Subscrições', description: 'Aprove subscrições pendentes rapidamente. Cada atraso é um utilizador que pode desistir e receita perdida.', icon: <ClipboardCheck className="h-8 w-8 text-primary" /> },
    { title: 'Monitorização de Agentes', description: 'Use o painel de Análise de Agentes para verificar quem está activo e quem precisa de acompanhamento. Scores baixos indicam problemas.', icon: <Users className="h-8 w-8 text-primary" /> },
    { title: 'Divulgação', description: 'Incentive os agentes a partilhar os links de referência. Mais divulgação = mais subscrições = mais receita para todos.', icon: <Megaphone className="h-8 w-8 text-primary" /> },
  ];

  return (
    <DashboardLayout 
      title={`Olá, ${profile?.nome?.split(' ')[0] || 'Utilizador'}!`}
      subtitle={`Painel de ${roleLabel}`}
    >
      <OnboardingGuide storageKey={`onboarding_seen_${isAdmin ? 'admin' : 'supervisor'}`} steps={supervisorOnboardingSteps} />
      <DashboardHint role={isAdmin ? 'admin' : 'supervisor'} />
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total de Zonas"
          value={stats.totalZones}
          sublabel={`${stats.activeZones} activas`}
          icon={MapPin}
          color="primary"
        />
        <StatCard
          label="Total de ATMs"
          value={stats.totalAtms}
          sublabel={`${stats.atmsWithCash} com dinheiro`}
          icon={Banknote}
          color="accent"
        />
        {(isAdmin || isSupervisor) && (
          <StatCard
            label="Agentes"
            value={stats.totalAgents}
            sublabel="activos"
            icon={Users}
            color="secondary"
          />
        )}
        <StatCard
          label="Receita"
          value={`${stats.revenue.toLocaleString()} KZ`}
          sublabel={`${stats.totalSubscriptions} subscrições`}
          icon={TrendingUp}
          color="success"
        />
      </div>

      {/* ATM Status Overview */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h2 className="font-semibold text-foreground mb-4">Estado dos ATMs</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-foreground">Com Dinheiro</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.atmsWithCash}</span>
                <span className="text-muted-foreground text-sm">
                  ({stats.totalAtms > 0 ? Math.round((stats.atmsWithCash / stats.totalAtms) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-foreground">Sem Dinheiro</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.atmsWithoutCash}</span>
                <span className="text-muted-foreground text-sm">
                  ({stats.totalAtms > 0 ? Math.round((stats.atmsWithoutCash / stats.totalAtms) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${stats.totalAtms > 0 ? (stats.atmsWithCash / stats.totalAtms) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h2 className="font-semibold text-foreground mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {isAdmin && (
              <Link to="/dashboard/zones">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Zona
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/dashboard/atms">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo ATM
                </Button>
              </Link>
            )}
            <Link to="/dashboard/zones">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Ver Zonas
              </Button>
            </Link>
            <Link to="/dashboard/atms">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Ver ATMs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Zones */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Zonas Recentes</h2>
          <Link to="/dashboard/zones">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </div>
        <RecentZonesList />
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  label, 
  value, 
  sublabel, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  sublabel: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: 'primary' | 'accent' | 'secondary' | 'success';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
    </div>
  );
}

function RecentZonesList() {
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pricePerAtm } = usePricePerAtm();

  useEffect(() => {
    const fetchZones = async () => {
      const [zonesRes, atmsRes] = await Promise.all([
        supabase.from('zones').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('atms').select('zone_id'),
      ]);

      const atmCounts = new Map<string, number>();
      (atmsRes.data || []).forEach(a => {
        if (a.zone_id) atmCounts.set(a.zone_id, (atmCounts.get(a.zone_id) || 0) + 1);
      });

      const enriched = (zonesRes.data || []).map(z => ({
        ...z,
        atm_count: atmCounts.get(z.id) || 0,
      }));

      setZones(enriched);
      setIsLoading(false);
    };

    fetchZones();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma zona encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {zones.map(zone => {
        const effectivePrice = zone.price_kz > 0 ? zone.price_kz : zone.atm_count * pricePerAtm;
        return (
          <div 
            key={zone.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div>
              <p className="font-medium text-foreground">{zone.name}</p>
              <p className="text-sm text-muted-foreground">
                {effectivePrice > 0 ? `${effectivePrice.toLocaleString()} KZ` : 'A calcular'}
              </p>
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              zone.status === 'active' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}>
              {zone.status === 'active' ? 'Activa' : 'Suspensa'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
