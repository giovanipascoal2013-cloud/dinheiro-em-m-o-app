import { useEffect, useState } from 'react';
import { Search, Users, UserPlus, X, MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AgentZone {
  id: string;
  zone_id: string;
  referral_code: string;
  zones?: { name: string } | null;
}

interface Agent {
  id: string;
  user_id: string;
  role: string;
  profiles: { nome: string | null; telefone: string } | null;
  agent_zones: AgentZone[];
}

interface Zone {
  id: string;
  name: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [agentsRes, zonesRes] = await Promise.all([
      supabase
        .from('user_roles')
        .select(`*, profiles:user_id (nome, telefone)`)
        .eq('role', 'agent'),
      supabase.from('zones').select('id, name').eq('status', 'active'),
    ]);

    const agentList = (agentsRes.data || []) as any[];

    // Fetch agent_zones for all agents
    const agentIds = agentList.map((a) => a.user_id);
    const { data: agentZonesData } = await supabase
      .from('agent_zones')
      .select('id, zone_id, referral_code, agent_id')
      .in('agent_id', agentIds.length > 0 ? agentIds : ['none']);

    // Enrich with zone names
    const zoneMap = new Map<string, string>();
    (zonesRes.data || []).forEach((z) => zoneMap.set(z.id, z.name));

    const enrichedAgents: Agent[] = agentList.map((a) => ({
      ...a,
      agent_zones: (agentZonesData || [])
        .filter((az) => az.agent_id === a.user_id)
        .map((az) => ({
          ...az,
          zones: { name: zoneMap.get(az.zone_id) || 'Zona desconhecida' },
        })),
    }));

    setAgents(enrichedAgents);
    setZones(zonesRes.data || []);
    setIsLoading(false);
  };

  const handleOpenAssignDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedZoneId('');
    setAssignDialogOpen(true);
  };

  const handleAssignZone = async () => {
    if (!selectedAgent || !selectedZoneId) return;

    // Check if already assigned
    const alreadyAssigned = selectedAgent.agent_zones.some(
      (az) => az.zone_id === selectedZoneId
    );
    if (alreadyAssigned) {
      toast({ title: 'Esta zona já está atribuída a este agente', variant: 'destructive' });
      return;
    }

    setIsAssigning(true);

    // Generate referral code using DB function
    const { data: codeData } = await supabase.rpc('generate_referral_code');
    const referralCode = codeData || `REF${Date.now()}`;

    const { error } = await supabase.from('agent_zones').insert({
      agent_id: selectedAgent.user_id,
      zone_id: selectedZoneId,
      referral_code: referralCode,
    });

    setIsAssigning(false);

    if (error) {
      toast({ title: 'Erro ao atribuir zona', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zona atribuída com sucesso' });
      setAssignDialogOpen(false);
      fetchData();
    }
  };

  const handleRemoveZone = async (agentZoneId: string) => {
    const { error } = await supabase
      .from('agent_zones')
      .delete()
      .eq('id', agentZoneId);

    if (error) {
      toast({ title: 'Erro ao remover zona', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zona removida do agente' });
      fetchData();
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.profiles?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.profiles?.telefone?.includes(searchQuery)
  );

  const getAvailableZones = () => {
    if (!selectedAgent) return zones;
    const assignedIds = new Set(selectedAgent.agent_zones.map((az) => az.zone_id));
    return zones.filter((z) => !assignedIds.has(z.id));
  };

  return (
    <DashboardLayout title="Agentes" subtitle="Gerir agentes do sistema">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar agentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum agente encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {agent.profiles?.nome?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {agent.profiles?.nome || 'Agente'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {agent.profiles?.telefone}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAssignDialog(agent)}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Atribuir Zona
                </Button>
              </div>

              {agent.agent_zones.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-13 pl-13">
                  {agent.agent_zones.map((az) => (
                    <Badge
                      key={az.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {az.zones?.name}
                      <button
                        onClick={() => handleRemoveZone(az.id)}
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Zone Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Atribuir Zona a {selectedAgent?.profiles?.nome || 'Agente'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar zona..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableZones().map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {getAvailableZones().length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Todas as zonas já estão atribuídas a este agente.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignZone}
              disabled={!selectedZoneId || isAssigning}
            >
              {isAssigning ? 'A atribuir...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
