import { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, Percent, 
  Save, Edit2, Check, X, RotateCcw, Loader2, ArrowRight,
  BarChart3, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { Link } from 'react-router-dom';

const PLATFORM_MARGIN = 0.30;

export default function FinanceDashboard() {
  const queryClient = useQueryClient();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [atms, setAtms] = useState<any[]>([]);
  const [pricePerAtm, setPricePerAtm] = useState('500');
  const [editingPricePerAtm, setEditingPricePerAtm] = useState(false);
  const [tempPricePerAtm, setTempPricePerAtm] = useState('500');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [tempZonePrice, setTempZonePrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [subsRes, wdRes, zonesRes, atmsRes, settingsRes] = await Promise.all([
      supabase.from('subscriptions').select('*'),
      supabase.from('withdrawals').select('*'),
      supabase.from('zones').select('*'),
      supabase.from('atms').select('zone_id'),
      supabase.from('platform_settings').select('*').eq('key', 'price_per_atm').maybeSingle(),
    ]);
    setSubscriptions(subsRes.data || []);
    setWithdrawals(wdRes.data || []);
    setZones(zonesRes.data || []);
    setAtms(atmsRes.data || []);
    const ppa = settingsRes.data?.value || '500';
    setPricePerAtm(ppa);
    setTempPricePerAtm(ppa);
    setIsLoading(false);
  };

  // ATM counts per zone
  const atmCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    atms.forEach(a => { if (a.zone_id) map[a.zone_id] = (map[a.zone_id] || 0) + 1; });
    return map;
  }, [atms]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'expired');
    const totalRevenue = activeSubs.reduce((sum, s) => sum + Number(s.amount_kz || 0), 0);
    
    const monthlySubs = activeSubs.filter(s => new Date(s.created_at) >= monthStart);
    const monthlyRevenue = monthlySubs.reduce((sum, s) => sum + Number(s.amount_kz || 0), 0);
    
    const paidWithdrawals = withdrawals.filter(w => w.status === 'completed' || w.status === 'paid');
    const totalPaid = paidWithdrawals.reduce((sum, w) => sum + Number(w.amount_kz || 0), 0);
    
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const totalPending = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount_kz || 0), 0);
    
    const platformMargin = totalRevenue * PLATFORM_MARGIN;

    return { totalRevenue, monthlyRevenue, totalPaid, totalPending, platformMargin };
  }, [subscriptions, withdrawals]);

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; receita: number; pagamentos: number; margem: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = d.toLocaleDateString('pt-AO', { month: 'short', year: '2-digit' });
      
      const monthSubs = subscriptions.filter(s => {
        const created = new Date(s.created_at);
        return created >= d && created <= end && (s.status === 'active' || s.status === 'expired');
      });
      const receita = monthSubs.reduce((sum, s) => sum + Number(s.amount_kz || 0), 0);
      
      const monthWd = withdrawals.filter(w => {
        const created = new Date(w.created_at);
        return created >= d && created <= end && (w.status === 'completed' || w.status === 'paid');
      });
      const pagamentos = monthWd.reduce((sum, w) => sum + Number(w.amount_kz || 0), 0);
      
      months.push({ month: label, receita, pagamentos, margem: receita * PLATFORM_MARGIN });
    }
    return months;
  }, [subscriptions, withdrawals]);

  // Zone summary
  const zoneSummary = useMemo(() => {
    return zones.map(z => {
      const zoneSubs = subscriptions.filter(s => s.zone_id === z.id && (s.status === 'active' || s.status === 'expired'));
      const activeSubs = subscriptions.filter(s => s.zone_id === z.id && s.status === 'active');
      const revenue = zoneSubs.reduce((sum, s) => sum + Number(s.amount_kz || 0), 0);
      const atmCount = atmCountMap[z.id] || 0;
      const effectivePrice = Number(z.price_kz) > 0 ? Number(z.price_kz) : Number(pricePerAtm) * atmCount;
      
      return {
        ...z,
        activeSubs: activeSubs.length,
        revenue,
        margin: revenue * PLATFORM_MARGIN,
        agentPayout: revenue * (1 - PLATFORM_MARGIN),
        atmCount,
        effectivePrice,
        isManualPrice: Number(z.price_kz) > 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [zones, subscriptions, atmCountMap, pricePerAtm]);

  // Recent withdrawals
  const recentWithdrawals = useMemo(() => {
    return [...withdrawals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [withdrawals]);

  const handleSavePricePerAtm = async () => {
    const val = parseInt(tempPricePerAtm);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: String(val), updated_at: new Date().toISOString() })
      .eq('key', 'price_per_atm');
    
    if (error) {
      toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
    } else {
      setPricePerAtm(String(val));
      setEditingPricePerAtm(false);
      queryClient.invalidateQueries({ queryKey: ['platform_settings', 'price_per_atm'] });
      toast({ title: 'Preço base actualizado' });
    }
    setSavingSettings(false);
  };

  const handleSaveZonePrice = async (zoneId: string) => {
    const val = parseInt(tempZonePrice);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('zones')
      .update({ price_kz: val })
      .eq('id', zoneId);
    
    if (error) {
      toast({ title: 'Erro ao guardar preço', description: error.message, variant: 'destructive' });
    } else {
      setZones(prev => prev.map(z => z.id === zoneId ? { ...z, price_kz: val } : z));
      setEditingZoneId(null);
      toast({ title: 'Preço da zona actualizado' });
    }
  };

  const handleResetZonePrice = async (zoneId: string) => {
    const { error } = await supabase
      .from('zones')
      .update({ price_kz: 0 })
      .eq('id', zoneId);
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setZones(prev => prev.map(z => z.id === zoneId ? { ...z, price_kz: 0 } : z));
      toast({ title: 'Preço reposto para automático' });
    }
  };

  const formatKz = (val: number) => `${val.toLocaleString('pt-AO')} KZ`;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      completed: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      paid: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const s = map[status] || { label: status, className: '' };
    return <Badge variant="outline" className={cn("text-xs", s.className)}>{s.label}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Painel Financeiro" subtitle="Análise financeira e controlo de preços">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Painel Financeiro" subtitle="Análise financeira e controlo de preços">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Receita Total', value: formatKz(kpis.totalRevenue), icon: DollarSign, color: 'text-emerald-600' },
          { label: 'Receita Mensal', value: formatKz(kpis.monthlyRevenue), icon: TrendingUp, color: 'text-primary' },
          { label: 'Pago a Agentes', value: formatKz(kpis.totalPaid), icon: TrendingDown, color: 'text-amber-600' },
          { label: 'Pendente', value: formatKz(kpis.totalPending), icon: Wallet, color: 'text-destructive' },
          { label: 'Margem (30%)', value: formatKz(kpis.platformMargin), icon: Percent, color: 'text-emerald-600' },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Price Settings side by side on desktop */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Receitas vs Pagamentos
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => formatKz(value)}
                  />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pagamentos" name="Pagamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="margem" name="Margem" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Global Price Setting */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Preço Base por ATM
            </CardTitle>
            <CardDescription>
              Valor aplicado a zonas sem preço manual definido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              {editingPricePerAtm ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={tempPricePerAtm}
                      onChange={e => setTempPricePerAtm(e.target.value)}
                      className="text-lg font-bold"
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground font-medium">KZ</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePricePerAtm} disabled={savingSettings}>
                      {savingSettings ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      <span className="ml-1">Guardar</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingPricePerAtm(false); setTempPricePerAtm(pricePerAtm); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{formatKz(Number(pricePerAtm))}</p>
                    <p className="text-xs text-muted-foreground mt-1">por ATM / zona</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditingPricePerAtm(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Exemplo: uma zona com 3 ATMs e sem preço manual custará <strong>{formatKz(Number(pricePerAtm) * 3)}</strong>/mês.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zone Pricing Table */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preços por Zona</CardTitle>
          <CardDescription>Gerir preços individuais. Zonas com preço "Auto" usam o preço base × nº ATMs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Zona</TableHead>
                  <TableHead className="text-center">ATMs</TableHead>
                  <TableHead className="text-center">Modo</TableHead>
                  <TableHead className="text-right">Preço Efectivo</TableHead>
                  <TableHead className="text-right w-[140px]">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zoneSummary.map(z => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="text-center">{z.atmCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-xs", z.isManualPrice ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground")}>
                        {z.isManualPrice ? 'Manual' : 'Auto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingZoneId === z.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={tempZonePrice}
                            onChange={e => setTempZonePrice(e.target.value)}
                            className="w-24 h-8 text-sm text-right"
                            min={0}
                          />
                          <Button size="icon-sm" variant="ghost" onClick={() => handleSaveZonePrice(z.id)}>
                            <Check className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditingZoneId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{formatKz(z.effectivePrice)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingZoneId !== z.id && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => { setEditingZoneId(z.id); setTempZonePrice(String(z.price_kz || 0)); }}
                            title="Editar preço"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {z.isManualPrice && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleResetZonePrice(z.id)}
                              title="Repor para automático"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {zoneSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma zona registada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Zone Revenue Summary */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo de Receitas por Zona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Zona</TableHead>
                  <TableHead className="text-center">Subs. Activas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Pago Agentes</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zoneSummary.map(z => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="text-center">{z.activeSubs}</TableCell>
                    <TableCell className="text-right">{formatKz(z.revenue)}</TableCell>
                    <TableCell className="text-right">{formatKz(z.agentPayout)}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">{formatKz(z.margin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Withdrawals */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Levantamentos Recentes</CardTitle>
            <CardDescription>Últimos 10 pedidos</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/withdrawals">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWithdrawals.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString('pt-AO')}</TableCell>
                    <TableCell className="text-right font-medium">{formatKz(Number(w.amount_kz))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground uppercase">{w.method}</TableCell>
                    <TableCell className="text-center">{statusBadge(w.status)}</TableCell>
                  </TableRow>
                ))}
                {recentWithdrawals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum levantamento registado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
