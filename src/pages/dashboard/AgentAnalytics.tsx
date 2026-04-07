import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, Star, TrendingUp, Clock, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface AgentData {
  agentId: string;
  name: string;
  zones: { id: string; name: string; likes: number; dislikes: number }[];
  totalLikes: number;
  totalDislikes: number;
  reputationScore: number;
  updates7d: number;
  updates30d: number;
  lastActivity: string | null;
}

const AgentAnalytics = () => {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get all agent assignments
      const { data: agentZones } = await supabase.from('agent_zones').select('agent_id, zone_id');
      if (!agentZones?.length) { setAgents([]); setLoading(false); return; }

      const agentIds = [...new Set(agentZones.map(az => az.agent_id))];
      const zoneIds = [...new Set(agentZones.map(az => az.zone_id))];

      // Fetch profiles, zones, ratings, activity in parallel
      const [profilesRes, zonesRes, ratingsRes, activityRes] = await Promise.all([
        supabase.from('profiles').select('user_id, nome').in('user_id', agentIds),
        supabase.from('zones').select('id, name').in('id', zoneIds),
        supabase.from('agent_ratings').select('agent_id, zone_id, value'),
        supabase.from('agent_activity_log').select('agent_id, created_at').in('agent_id', agentIds).order('created_at', { ascending: false }),
      ]);

      const profiles = profilesRes.data ?? [];
      const zones = zonesRes.data ?? [];
      const ratings = ratingsRes.data ?? [];
      const activity = activityRes.data ?? [];

      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const agentsData: AgentData[] = agentIds.map(agentId => {
        const profile = profiles.find(p => p.user_id === agentId);
        const myZoneIds = agentZones.filter(az => az.agent_id === agentId).map(az => az.zone_id);
        const myRatings = ratings.filter(r => r.agent_id === agentId);
        const myActivity = activity.filter(a => a.agent_id === agentId);

        const totalLikes = myRatings.filter(r => r.value === 1).length;
        const totalDislikes = myRatings.filter(r => r.value === 0).length;
        const total = totalLikes + totalDislikes;
        const reputationScore = total > 0 ? Math.round((totalLikes / total) * 5 * 10) / 10 : 0;

        const updates7d = myActivity.filter(a => new Date(a.created_at) >= d7).length;
        const updates30d = myActivity.filter(a => new Date(a.created_at) >= d30).length;
        const lastActivity = myActivity.length > 0 ? myActivity[0].created_at : null;

        const zoneDetails = myZoneIds.map(zid => {
          const zone = zones.find(z => z.id === zid);
          const zoneRatings = myRatings.filter(r => r.zone_id === zid);
          return {
            id: zid,
            name: zone?.name ?? 'Desconhecida',
            likes: zoneRatings.filter(r => r.value === 1).length,
            dislikes: zoneRatings.filter(r => r.value === 0).length,
          };
        });

        return {
          agentId,
          name: profile?.nome ?? 'Sem nome',
          zones: zoneDetails,
          totalLikes,
          totalDislikes,
          reputationScore,
          updates7d,
          updates30d,
          lastActivity,
        };
      });

      // Sort by reputation desc
      agentsData.sort((a, b) => b.reputationScore - a.reputationScore);
      setAgents(agentsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.zones.some(z => z.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <DashboardLayout title="Análise de Agentes" subtitle="Desempenho e fiabilidade">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Análise de Agentes" subtitle="Desempenho e fiabilidade">
      <div className="mb-4">
        <Input
          placeholder="Pesquisar por nome ou zona..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-muted-foreground">Nenhum agente encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(agent => (
            <AgentCard key={agent.agentId} agent={agent} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

function AgentCard({ agent }: { agent: AgentData }) {
  const [expanded, setExpanded] = useState(false);
  const totalVotes = agent.totalLikes + agent.totalDislikes;
  const scorePercent = totalVotes > 0 ? (agent.totalLikes / totalVotes) * 100 : 0;
  const isLow = agent.reputationScore > 0 && agent.reputationScore < 2.5;

  return (
    <div className={cn(
      "bg-card rounded-xl border shadow-card overflow-hidden transition-colors",
      isLow ? "border-destructive/50" : "border-border/50"
    )}>
      {/* Header */}
      <button
        className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0",
              isLow ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm truncate">{agent.name}</h3>
                {isLow && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> Alerta
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{agent.zones.length} zona{agent.zones.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Score */}
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className={cn("h-4 w-4", isLow ? "text-destructive" : "text-warning")} />
                <span className={cn("font-bold text-sm", isLow ? "text-destructive" : "text-foreground")}>
                  {totalVotes > 0 ? agent.reputationScore.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-muted-foreground">/5</span>
              </div>
              <p className="text-xs text-muted-foreground">{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</p>
            </div>

            {/* Activity */}
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{agent.updates7d}</span>
              </div>
              <p className="text-xs text-muted-foreground">7 dias</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalVotes > 0 && (
          <div className="mt-3">
            <Progress value={scorePercent} className="h-1.5" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-success flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{agent.totalLikes}</span>
              <span className="text-xs text-destructive flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{agent.totalDislikes}</span>
            </div>
          </div>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {/* Activity stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{agent.updates7d}</p>
              <p className="text-xs text-muted-foreground">Atualizações (7d)</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{agent.updates30d}</p>
              <p className="text-xs text-muted-foreground">Atualizações (30d)</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-foreground">
                {agent.lastActivity
                  ? formatDistanceToNow(new Date(agent.lastActivity), { addSuffix: true, locale: pt })
                  : 'Sem actividade'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Última acção</p>
            </div>
          </div>

          {/* Zones breakdown */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Zonas geridas
            </h4>
            <div className="space-y-2">
              {agent.zones.map(z => {
                const zTotal = z.likes + z.dislikes;
                const zScore = zTotal > 0 ? Math.round((z.likes / zTotal) * 5 * 10) / 10 : 0;
                return (
                  <div key={z.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground">{z.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-success flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{z.likes}</span>
                      <span className="text-xs text-destructive flex items-center gap-0.5"><ThumbsDown className="h-3 w-3" />{z.dislikes}</span>
                      <span className="text-xs font-medium text-muted-foreground">{zTotal > 0 ? `${zScore}/5` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentAnalytics;
