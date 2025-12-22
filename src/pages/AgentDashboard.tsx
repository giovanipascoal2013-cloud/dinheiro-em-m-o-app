import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  TrendingUp, 
  Wallet, 
  Clock, 
  ChevronRight, 
  RefreshCw,
  LogOut,
  User,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Edit
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { mockZones, mockATMs, mockAgents } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Simulating agent data
const currentAgent = mockAgents[0];
const agentZones = mockZones.filter(z => currentAgent.zonas.includes(z.id));
const agentATMs = mockATMs.filter(atm => agentZones.some(z => z.id === atm.zona_id));

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const totalEarnings = agentZones.reduce((sum, z) => sum + z.price_kz * 3, 0); // Mock: 3 subscribers per zone
  const pendingPayout = Math.round(totalEarnings * 0.7); // 70% agent share

  const handleUpdateATM = (atmId: string) => {
    toast({
      title: 'ATM atualizado',
      description: 'O estado do ATM foi atualizado com sucesso.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Welcome section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {currentAgent.nome.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">Painel do Agente</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Zonas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{agentZones.length}</p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Banknote className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">ATMs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{agentATMs.length}</p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-success/10 p-2 rounded-lg">
                <ThumbsUp className="h-4 w-4 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Likes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{currentAgent.total_likes}</p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-warning/10 p-2 rounded-lg">
                <Wallet className="h-4 w-4 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">Pendente</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingPayout.toLocaleString()} KZ</p>
          </div>
        </div>

        {/* Reputation overview */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-8">
          <h2 className="font-semibold text-foreground mb-4">Sua Reputação</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={cn(
                "text-4xl font-bold",
                currentAgent.avg_reputation >= 4 ? "text-accent" : 
                currentAgent.avg_reputation >= 2.5 ? "text-foreground" : "text-warning"
              )}>
                {currentAgent.avg_reputation.toFixed(1)}
              </div>
              <span className="text-muted-foreground">/5</span>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    currentAgent.avg_reputation >= 4 ? "bg-accent" :
                    currentAgent.avg_reputation >= 2.5 ? "bg-primary" : "bg-warning"
                  )}
                  style={{ width: `${(currentAgent.avg_reputation / 5) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-success flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {currentAgent.total_likes}
                </span>
                <span className="text-destructive flex items-center gap-1">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {currentAgent.total_dislikes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones section */}
        <section className="mb-8">
          <h2 className="font-semibold text-foreground mb-4">Suas Zonas</h2>
          <div className="space-y-3">
            {agentZones.map((zone) => {
              const zoneATMs = agentATMs.filter(a => a.zona_id === zone.id);
              const withMoney = zoneATMs.filter(a => a.status_atm === 'com_dinheiro').length;
              
              return (
                <div 
                  key={zone.id}
                  className="bg-card rounded-xl p-4 shadow-card border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{zone.nome}</h3>
                      <p className="text-sm text-muted-foreground">{zone.atm_count} ATMs · {zone.cidade}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      zone.reputation_score >= 4 ? "bg-success/10 text-success" :
                      zone.reputation_score >= 2.5 ? "bg-secondary text-secondary-foreground" :
                      "bg-warning/10 text-warning"
                    )}>
                      ★ {zone.reputation_score.toFixed(1)}
                    </div>
                  </div>

                  {/* ATMs list for this zone */}
                  <div className="space-y-2 mb-3">
                    {zoneATMs.slice(0, 3).map((atm) => (
                      <div 
                        key={atm.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{atm.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado {formatDistanceToNow(new Date(atm.last_update_at), { addSuffix: true, locale: pt })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            atm.status_atm === 'com_dinheiro' ? "bg-success" :
                            atm.status_atm === 'sem_dinheiro' ? "bg-destructive" : "bg-muted-foreground"
                          )} />
                          <Button 
                            variant="ghost" 
                            size="icon-sm"
                            onClick={() => handleUpdateATM(atm.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {zoneATMs.length > 3 && (
                    <button className="text-sm text-primary hover:underline">
                      Ver todos os {zoneATMs.length} ATMs
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Earnings section */}
        <section className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <h2 className="font-semibold text-foreground mb-4">Ganhos</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total este trimestre</span>
              <span className="font-semibold text-foreground">{totalEarnings.toLocaleString()} KZ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sua parte (70%)</span>
              <span className="font-bold text-accent text-lg">{pendingPayout.toLocaleString()} KZ</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Próximo pagamento</span>
              <span className="text-foreground">Janeiro 2025</span>
            </div>
            <Button variant="outline" className="w-full mt-2">
              Ver histórico de pagamentos
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AgentDashboard;
