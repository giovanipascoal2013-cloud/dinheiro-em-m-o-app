import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, User, Clock, AlertTriangle, Lock } from 'lucide-react';
import { Header } from '@/components/Header';
import { ATMList } from '@/components/ATMList';
import { RatingWidget, RatingCTA } from '@/components/RatingWidget';
import { PaymentModal } from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { getZoneById, getATMsByZoneId, getAgentById } from '@/data/mockData';
import { Zone, ATM, Agent } from '@/types';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ZoneDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zone, setZone] = useState<Zone | null>(null);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

  useEffect(() => {
    if (id) {
      const zoneData = getZoneById(id);
      if (zoneData) {
        setZone(zoneData);
        setAtms(getATMsByZoneId(id));
        setAgent(getAgentById(zoneData.agent_id) || null);
        setIsSubscribed(isUserSubscribed(mockCurrentUser.id, id));
      }
    }
  }, [id]);

  const handleVote = async (value: 'like' | 'dislike') => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setUserVote(value);
    toast({
      title: value === 'like' ? 'Obrigado pelo voto positivo!' : 'Voto registado',
      description: 'A sua avaliação ajuda a comunidade.',
    });
  };

  const handleReportATM = (atm: ATM) => {
    toast({
      title: 'Reportar ATM',
      description: `Funcionalidade de reportar "${atm.nome}" em desenvolvimento.`,
    });
  };

  const handlePaymentSuccess = () => {
    setIsSubscribed(true);
    setShowPaymentModal(false);
    toast({
      title: 'Subscrição ativada!',
      description: `Agora tem acesso à zona ${zone?.nome}.`,
    });
  };

  if (!zone) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Zona não encontrada</p>
          <Button variant="ghost" onClick={() => navigate('/')} className="mt-4">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const hasLowScore = zone.reputation_score < 2.5;
  const atmStats = {
    available: atms.filter(a => a.status_atm === 'com_dinheiro').length,
    unavailable: atms.filter(a => a.status_atm === 'sem_dinheiro').length,
    offline: atms.filter(a => a.status_atm === 'offline').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Back button & header */}
      <div className="container mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Zone header */}
      <section className="container mx-auto px-4 pb-6">
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{zone.nome}</h1>
                {hasLowScore && (
                  <div className="bg-warning/10 text-warning p-1 rounded-full">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{zone.cidade}</span>
              </div>
            </div>

            {isSubscribed ? (
              <div className="bg-success/10 text-success text-sm font-medium px-3 py-1.5 rounded-full">
                Subscrito
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground p-2.5 rounded-lg">
                <Lock className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{zone.atm_count}</p>
              <p className="text-xs text-muted-foreground">ATMs</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${hasLowScore ? 'bg-warning/10' : 'bg-accent/10'}`}>
              <div className="flex items-center justify-center gap-1">
                <Star className={`h-5 w-5 ${hasLowScore ? 'text-warning' : 'text-accent'}`} />
                <span className={`text-2xl font-bold ${hasLowScore ? 'text-warning' : 'text-foreground'}`}>
                  {zone.reputation_score.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Avaliação</p>
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

          {/* Agent info */}
          {agent && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <div className="bg-primary/10 p-2.5 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Agente: {agent.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {agent.verified ? 'Verificado ✓' : 'Não verificado'} · {zone.likes + zone.dislikes} avaliações
                </p>
              </div>
              {isSubscribed && (
                <RatingWidget
                  likes={zone.likes}
                  dislikes={zone.dislikes}
                  userVote={userVote}
                  onVote={handleVote}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 pb-8">
        {isSubscribed ? (
          <div className="space-y-6">
            {/* ATM list */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                ATMs na zona ({atms.length})
              </h2>
              <ATMList atms={atms} onReportATM={handleReportATM} />
            </section>

            {/* Rating CTA if not voted */}
            {!userVote && agent && (
              <RatingCTA agentName={agent.nome} onRate={() => {}} />
            )}
          </div>
        ) : (
          /* Paywall */
          <div className="bg-card rounded-2xl p-8 text-center shadow-card border border-border/50 max-w-md mx-auto">
            <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Acesso à Zona Bloqueado
            </h2>
            <p className="text-muted-foreground mb-6">
              Subscreva para ver o estado dos {zone.atm_count} ATMs e avaliar o agente.
              Acesso mensal por apenas <strong>{zone.price_kz} KZ</strong>.
            </p>
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => setShowPaymentModal(true)}
            >
              Subscrever por {zone.price_kz} KZ
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Pagamento seguro via Multicaixa Express
            </p>
          </div>
        )}
      </main>

      {/* Payment modal */}
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
