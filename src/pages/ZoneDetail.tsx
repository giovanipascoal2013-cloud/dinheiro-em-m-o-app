import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Lock, Banknote, Clock, CheckCircle2, XCircle, WifiOff } from 'lucide-react';
import { Header } from '@/components/Header';
import { PaymentModal } from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface DBZone {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  price_kz: number;
  status: string;
}

interface DBAtm {
  id: string;
  bank_name: string;
  address: string;
  has_cash: boolean;
  last_updated: string;
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

  useEffect(() => {
    if (id) fetchZone();
  }, [id]);

  useEffect(() => {
    if (id && user) checkSubscription();
  }, [id, user]);

  const fetchZone = async () => {
    const { data: zoneData } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id!)
      .single();

    if (zoneData) {
      setZone(zoneData);

      const { data: atmsData } = await supabase
        .from('atms')
        .select('id, bank_name, address, has_cash, last_updated')
        .eq('zone_id', id!)
        .order('last_updated', { ascending: false });

      if (atmsData) setAtms(atmsData);
    }
    setLoading(false);
  };

  const checkSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user!.id)
      .eq('zone_id', id!)
      .eq('status', 'active')
      .maybeSingle();

    setIsSubscribed(!!data);
  };

  const handlePaymentSuccess = () => {
    setIsSubscribed(true);
    setShowPaymentModal(false);
    toast({ title: 'Subscrição registada!', description: 'Aguarde aprovação do pagamento.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="h-48 bg-card rounded-2xl animate-pulse" />
        </div>
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
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">{zone.name}</h1>
              {zone.description && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{zone.description}</span>
                </div>
              )}
            </div>
            {isSubscribed ? (
              <div className="bg-success/10 text-success text-sm font-medium px-3 py-1.5 rounded-full">Subscrito</div>
            ) : (
              <div className="bg-muted text-muted-foreground p-2.5 rounded-lg">
                <Lock className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{atms.length}</p>
              <p className="text-xs text-muted-foreground">ATMs</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{zone.price_kz}</p>
              <p className="text-xs text-muted-foreground">KZ / mês</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-success">{atmStats.available}</p>
              <p className="text-xs text-muted-foreground">Com dinheiro</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 pb-8">
        {isSubscribed ? (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">ATMs na zona ({atms.length})</h2>
            <div className="space-y-3">
              {atms.map((atm) => (
                <div key={atm.id} className="bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4 text-primary flex-shrink-0" />
                        <h4 className="font-semibold text-foreground truncate">{atm.bank_name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1">{atm.address}</p>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Clock className="h-3 w-3" />
                        <span>Atualizado {formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt })}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ml-3",
                      atm.has_cash ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {atm.has_cash ? (
                        <><CheckCircle2 className="h-3 w-3" /> Com dinheiro</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Sem dinheiro</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {atms.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum ATM registado nesta zona.</p>
              )}
            </div>
          </section>
        ) : (
          <div className="bg-card rounded-2xl p-8 text-center shadow-card border border-border/50 max-w-md mx-auto">
            <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Acesso à Zona Bloqueado</h2>
            <p className="text-muted-foreground mb-6">
              Subscreva para ver o estado dos {atms.length} ATMs.
              Acesso mensal por apenas <strong>{zone.price_kz} KZ</strong>.
            </p>
            <Button variant="hero" size="lg" className="w-full" onClick={() => setShowPaymentModal(true)}>
              Subscrever por {zone.price_kz} KZ
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Pagamento seguro via Multicaixa Express</p>
          </div>
        )}
      </main>

      <PaymentModal
        zone={zone}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default ZoneDetail;
