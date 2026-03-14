import { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface WithdrawalRow {
  id: string;
  agent_id: string;
  amount_kz: number;
  method: string;
  bank_details: any;
  status: string;
  created_at: string;
  agent_nome?: string;
  agent_telefone?: string;
}

export default function WithdrawalsPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let query = supabase.from('withdrawals').select('*');
      if (filter === 'pending') query = query.eq('status', 'pending');
      query = query.order('created_at', { ascending: false });

      const { data } = await query;
      if (!data) { setWithdrawals([]); setLoading(false); return; }

      const agentIds = [...new Set(data.map(w => w.agent_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nome, telefone').in('user_id', agentIds);
      const profilesMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      setWithdrawals(data.map(w => ({
        ...w,
        agent_nome: profilesMap.get(w.agent_id)?.nome ?? 'Agente',
        agent_telefone: profilesMap.get(w.agent_id)?.telefone ?? '',
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!user) return;
    setProcessing(id);
    try {
      const { error } = await supabase.from('withdrawals')
        .update({ status: 'completed', processed_by: user.id, processed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const withdrawal = withdrawals.find(w => w.id === id);
      if (withdrawal) {
        await supabase.from('notifications').insert({
          user_id: withdrawal.agent_id,
          title: 'Levantamento processado',
          message: `O seu levantamento de ${Number(withdrawal.amount_kz).toLocaleString()} KZ foi transferido com sucesso.`,
          type: 'success',
        });
      }

      toast({ title: 'Levantamento marcado como pago' });
      fetchWithdrawals();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <DashboardLayout title="Levantamentos" subtitle="Solicitações de levantamento dos agentes">
      <div className="flex gap-2 mb-6">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
          <Clock className="h-4 w-4 mr-1" /> Pendentes
        </Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          Todos
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum levantamento {filter === 'pending' ? 'pendente' : ''} encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map(w => (
            <div key={w.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-foreground">{w.agent_nome}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                      w.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    )}>
                      {w.status === 'pending' ? 'Pendente' : 'Pago'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{w.agent_telefone}</p>
                  <p className="text-lg font-bold text-foreground mt-2">{Number(w.amount_kz).toLocaleString()} KZ</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Método: <span className="font-medium text-foreground">{w.method === 'iban' ? 'Transferência IBAN' : 'Multicaixa Express'}</span>
                  </p>

                  {/* Bank details */}
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Dados bancários:</p>
                    {w.method === 'iban' ? (
                      <>
                        <p className="text-sm"><span className="text-muted-foreground">Titular:</span> {w.bank_details?.titular ?? '—'}</p>
                        <p className="text-sm"><span className="text-muted-foreground">IBAN:</span> <span className="font-mono">{w.bank_details?.iban ?? '—'}</span></p>
                        <p className="text-sm"><span className="text-muted-foreground">Banco:</span> {w.bank_details?.banco ?? '—'}</p>
                      </>
                    ) : (
                      <p className="text-sm"><span className="text-muted-foreground">Telefone:</span> {w.bank_details?.telefone ?? '—'}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(w.created_at), { addSuffix: true, locale: pt })}
                  </p>
                </div>

                {w.status === 'pending' && (
                  <Button
                    onClick={() => handleMarkPaid(w.id)}
                    disabled={processing === w.id}
                    className="shrink-0"
                  >
                    {processing === w.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Marcar como Pago
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
