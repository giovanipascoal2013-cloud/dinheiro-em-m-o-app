import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Lock, Banknote, Clock, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/Header';
import { PaymentModal } from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface DBZone {
  id: string; name: string; description: string | null;
  latitude: number; longitude: number; price_kz: number; status: string;
}

interface DBAtm {
  id: string; bank_name: string; address: string; has_cash: boolean;
  has_paper: boolean | null; fila: string | null; status: string | null;
  obs: string | null; last_updated: string;
}

const ZoneDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zone, setZone] = useState<DBZone | null>(null);
  const [atms, setAtms] = useState<DBAtm[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchZone(); }, [id]);
  useEffect(() => { if (id && user) checkSubscription(); }, [id, user]);

  const fetchZone = async () => {
    const [zoneRes, atmsRes] = await Promise.all([
      supabase.from('zones').select('*').eq('id', id!).single(),
      supabase.from('atms').select('id, bank_name, address, has_cash, has_paper, fila, status, obs, last_updated').eq('zone_id', id!).order('last_updated', { ascending: false }),
    ]);
    if (zoneRes.data) setZone(zoneRes.data);
    if (atmsRes.data) setAtms(atmsRes.data as DBAtm[]);
    setLoading(false);
  };

  const checkSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions').select('id')
      .eq('user_id', user!.id).eq('zone_id', id!)
      .eq('status', 'active').gte('expiry_date', new Date().toISOString())
      .maybeSingle();
    setIsSubscribed(!!data);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast({ title: 'Pagamento registado!', description: 'A sua subscrição será activada após aprovação do pagamento.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16"><div className="h-48 bg-card rounded-2xl animate-pulse" /></div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Zona não encontrada</p>
          <Button variant="ghost" onClick={() => navigate('/')} className="mt-4">Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const effectivePrice = zone.price_kz > 0 ? zone.price_kz : atms.length * 500;

  const atmStats = {
    available: atms.filter(a => a.has_cash).length,
    unavailable: atms.filter(a => !a.has_cash).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Zone header */}
      <section className="container mx-auto px-4 pb-6">
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">{zone.name}</h1>
              {zone.description && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{zone.description}</span>
                </div>
              )}
            </div>
            {isSubscribed ? (
              <div className="bg-success/10 text-success text-xs font-medium px-3 py-1.5 rounded-full shrink-0">Subscrito</div>
            ) : (
              <div className="bg-muted text-muted-foreground p-2 rounded-lg shrink-0">
                <Lock className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{atms.length}</p>
              <p className="text-xs text-muted-foreground">ATMs</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{effectivePrice}</p>
              <p className="text-xs text-muted-foreground">KZ / mês</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-success">{atmStats.available}</p>
              <p className="text-xs text-muted-foreground">Com $</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 pb-8">
        {isSubscribed ? (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">ATMs na zona ({atms.length})</h2>
            <div className="space-y-3">
              {atms.map((atm) => (
                <div key={atm.id} className="bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0",
                          atm.status === 'Fora de Serviço' ? 'bg-muted-foreground' : atm.has_cash ? 'bg-success' : 'bg-destructive'
                        )} />
                        <h4 className="font-semibold text-foreground text-sm truncate">{atm.bank_name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{atm.address}</p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2",
                      atm.has_cash ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {atm.has_cash ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {atm.has_cash ? 'Com $' : 'Sem $'}
                    </div>
                  </div>
                  
                  {/* Extra info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Papel: {atm.has_paper ? '✓' : '✗'}
                    </span>
                    {atm.fila && <span>🕐 {atm.fila}</span>}
                    {atm.status && atm.status !== 'Operacional' && (
                      <span className="text-warning flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {atm.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(atm.last_updated), 'dd/MM/yyyy HH:mm', { locale: pt })}</span>
                  </div>

                  {atm.obs && (
                    <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded px-2 py-1.5">📝 {atm.obs}</p>
                  )}
                </div>
              ))}
              {atms.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum ATM registado nesta zona.</p>
              )}
            </div>
          </section>
        ) : (
          <div className="bg-card rounded-2xl p-6 text-center shadow-card border border-border/50 max-w-md mx-auto">
            <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Acesso à Zona Bloqueado</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Subscreva para ver o estado dos {atms.length} ATMs.
              Acesso mensal por apenas <strong>{effectivePrice} KZ</strong>.
            </p>
            <Button variant="hero" size="lg" className="w-full" onClick={() => setShowPaymentModal(true)} disabled={effectivePrice === 0}>
              {effectivePrice === 0 ? 'Preço ainda não definido' : `Subscrever por ${effectivePrice} KZ`}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Pagamento seguro via Multicaixa Express</p>
          </div>
        )}
      </main>

      <PaymentModal zone={{ ...zone, price_kz: effectivePrice }} isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} />
    </div>
  );
};

export default ZoneDetail;
