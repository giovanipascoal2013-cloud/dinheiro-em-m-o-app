import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, Search, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SubscriptionRow {
  id: string;
  user_id: string;
  zone_id: string;
  amount_kz: number;
  payment_ref: string | null;
  status: string;
  created_at: string;
  expiry_date: string;
  user_nome?: string;
  user_telefone?: string;
  zone_name?: string;
}

type FilterType = 'pending' | 'active' | 'rejected' | 'expired' | 'all';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [filter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      // Auto-reject pending subs older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await supabase.from('subscriptions')
        .update({ status: 'rejected' })
        .eq('status', 'pending')
        .lt('created_at', thirtyDaysAgo.toISOString());

      let query = supabase.from('subscriptions').select('*');
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      query = query.order('created_at', { ascending: false });

      const { data: subs } = await query;
      if (!subs) { setSubscriptions([]); setLoading(false); return; }

      const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))] as string[];
      const zoneIds = [...new Set(subs.map(s => s.zone_id))];

      const [profilesRes, zonesRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('user_id, nome, telefone').in('user_id', userIds) : Promise.resolve({ data: [] }),
        supabase.from('zones').select('id, name').in('id', zoneIds),
      ]);

      const profilesMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p]));
      const zonesMap = new Map((zonesRes.data ?? []).map(z => [z.id, z.name]));

      const enriched = subs.map(s => ({
        ...s,
        user_nome: profilesMap.get(s.user_id ?? '')?.nome ?? 'Desconhecido',
        user_telefone: profilesMap.get(s.user_id ?? '')?.telefone ?? '',
        zone_name: zonesMap.get(s.zone_id) ?? s.zone_id,
      }));

      setSubscriptions(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sub: SubscriptionRow) => {
    setProcessing(sub.id);
    try {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase.from('subscriptions')
        .update({ status: 'active', expiry_date: expiryDate.toISOString() })
        .eq('id', sub.id);

      if (error) throw error;

      if (sub.payment_ref) {
        await supabase.from('transactions')
          .update({ status: 'completed' })
          .eq('payment_ref', sub.payment_ref);
      }

      if (sub.user_id) {
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          title: 'Subscrição aprovada!',
          message: `A sua subscrição para a zona "${sub.zone_name}" foi aprovada. Tem acesso por 30 dias.`,
          type: 'success',
        });
      }

      toast({ title: 'Subscrição aprovada', description: `Utilizador ${sub.user_nome} aprovado.` });
      fetchSubscriptions();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (subId: string) => {
    setProcessing(subId);
    const sub = subscriptions.find(s => s.id === subId);
    try {
      const { error } = await supabase.from('subscriptions')
        .update({ status: 'rejected' })
        .eq('id', subId);

      if (error) throw error;

      if (sub?.payment_ref) {
        await supabase.from('transactions')
          .update({ status: 'failed' })
          .eq('payment_ref', sub.payment_ref);
      }

      if (sub?.user_id) {
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          title: 'Subscrição não aprovada',
          message: `A sua subscrição para a zona "${sub.zone_name}" não foi aprovada. Contacte-nos pelo 933 986 318 para mais informações.`,
          type: 'error',
        });
      }

      toast({ title: 'Subscrição rejeitada' });
      setRejectDialog(null);
      fetchSubscriptions();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const filtered = subscriptions.filter(s =>
    !search || 
    s.user_nome?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_telefone?.includes(search) ||
    s.payment_ref?.toLowerCase().includes(search.toLowerCase()) ||
    s.zone_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning',
    active: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
    expired: 'bg-muted text-muted-foreground',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    active: 'Ativa',
    rejected: 'Rejeitada',
    expired: 'Expirada',
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'pending', label: 'Pendentes' },
    { key: 'active', label: 'Ativas' },
    { key: 'rejected', label: 'Rejeitadas' },
    { key: 'expired', label: 'Expiradas' },
    { key: 'all', label: 'Todas' },
  ];

  return (
    <DashboardLayout title="Subscrições" subtitle="Aprovar ou rejeitar subscrições">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {filterButtons.map(fb => (
            <Button
              key={fb.key}
              variant={filter === fb.key ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setFilter(fb.key)}
            >
              {fb.label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone, referência ou zona..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma subscrição {filter !== 'all' ? statusLabels[filter]?.toLowerCase() : ''} encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <div key={sub.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground truncate">{sub.user_nome}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[sub.status] ?? 'bg-muted text-muted-foreground')}>
                      {statusLabels[sub.status] ?? sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{sub.user_telefone}</p>
                  <p className="text-sm text-muted-foreground">Zona: <span className="font-medium text-foreground">{sub.zone_name}</span></p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Ref: <span className="font-mono">{sub.payment_ref ?? '—'}</span></span>
                    <span>{Number(sub.amount_kz).toLocaleString()} KZ</span>
                    <span>{formatDistanceToNow(new Date(sub.created_at), { addSuffix: true, locale: pt })}</span>
                  </div>
                </div>

                {sub.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(sub)}
                      disabled={processing === sub.id}
                    >
                      {processing === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialog(sub.id)}
                      disabled={processing === sub.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar subscrição?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O utilizador será notificado e orientado a contactar o suporte pelo número 933 986 318.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => rejectDialog && handleReject(rejectDialog)} disabled={!!processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Rejeição'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
