import { useEffect, useState } from 'react';
import { Search, Users, X, MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AgentZone {
  id: string; zone_id: string; referral_code: string;
  zones?: { name: string } | null;
}
interface Agent {
  id: string; user_id: string; role: string;
  profiles: { nome: string | null; telefone: string } | null;
  agent_zones: AgentZone[];
}
interface Zone { id: string; name: string; status: string; }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [rolesRes, zonesRes] = await Promise.all([
      supabase.from('user_roles').select('*').eq('role', 'agent'),
      supabase.from('zones').select('id, name, status'),
    ]);

    const agentRoles = rolesRes.data || [];
    const agentUserIds = agentRoles.map((a: any) => a.user_id);

    const [profilesRes, agentZonesRes] = await Promise.all([
      supabase.from('profiles').select('user_id, nome, telefone').in('user_id', agentUserIds.length > 0 ? agentUserIds : ['none']),
      supabase.from('agent_zones').select('id, zone_id, referral_code, agent_id').in('agent_id', agentUserIds.length > 0 ? agentUserIds : ['none']),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const zoneMap = new Map((zonesRes.data || []).map(z => [z.id, z.name]));

    const enrichedAgents: Agent[] = agentRoles.map((a: any) => ({
      ...a,
      profiles: profilesMap.get(a.user_id) || null,
      agent_zones: (agentZonesRes.data || [])
        .filter((az: any) => az.agent_id === a.user_id)
        .map((az: any) => ({ ...az, zones: { name: zoneMap.get(az.zone_id) || 'Zona desconhecida' } })),
    }));

    setAgents(enrichedAgents);
    setZones(zonesRes.data || []);
    setIsLoading(false);
  };

  const handleAssignZone = async () => {
    if (!selectedAgent || !selectedZoneId) return;
    if (selectedAgent.agent_zones.some(az => az.zone_id === selectedZoneId)) {
      toast({ title: 'Zona já atribuída', variant: 'destructive' }); return;
    }

    setIsAssigning(true);
    const { data: codeData } = await supabase.rpc('generate_referral_code');

    const { error } = await supabase.from('agent_zones').insert({
      agent_id: selectedAgent.user_id,
      zone_id: selectedZoneId,
      referral_code: codeData || `REF${Date.now()}`,
    });

    if (!error) {
      // Auto-activate zone if suspended
      const zone = zones.find(z => z.id === selectedZoneId);
      if (zone && zone.status !== 'active') {
        await supabase.from('zones').update({ status: 'active' }).eq('id', selectedZoneId);
      }
      toast({ title: 'Zona atribuída com sucesso' });
      setAssignDialogOpen(false);
      fetchData();
    } else {
      toast({ title: 'Erro ao atribuir', description: error.message, variant: 'destructive' });
    }
    setIsAssigning(false);
  };

  const handleRemoveZone = async (agentZoneId: string) => {
    const { error } = await supabase.from('agent_zones').delete().eq('id', agentZoneId);
    if (!error) { toast({ title: 'Zona removida' }); fetchData(); }
    else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
  };

  const filteredAgents = agents.filter(a =>
    a.profiles?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.profiles?.telefone?.includes(searchQuery)
  );

  const getAvailableZones = () => {
    if (!selectedAgent) return zones;
    const assignedIds = new Set(selectedAgent.agent_zones.map(az => az.zone_id));
    return zones.filter(z => !assignedIds.has(z.id));
  };

  return (
    <DashboardLayout title="Agentes" subtitle="Gerir agentes">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar agentes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum agente encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAgents.map(agent => (
            <div key={agent.id} className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">{agent.profiles?.nome?.charAt(0) || 'A'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{agent.profiles?.nome || 'Agente'}</p>
                    <p className="text-xs text-muted-foreground">{agent.profiles?.telefone}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => { setSelectedAgent(agent); setSelectedZoneId(''); setAssignDialogOpen(true); }}>
                  <MapPin className="h-3.5 w-3.5 mr-1" />Atribuir
                </Button>
              </div>
              {agent.agent_zones.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {agent.agent_zones.map(az => (
                    <Badge key={az.id} variant="secondary" className="text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{az.zones?.name}
                      <button onClick={() => handleRemoveZone(az.id)} className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3 text-destructive" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir Zona a {selectedAgent?.profiles?.nome || 'Agente'}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger><SelectValue placeholder="Selecionar zona..." /></SelectTrigger>
              <SelectContent>
                {getAvailableZones().map(z => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name} {z.status !== 'active' && <span className="text-muted-foreground">(suspensa — será activada)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getAvailableZones().length === 0 && <p className="text-xs text-muted-foreground mt-2">Todas as zonas já estão atribuídas.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAssignZone} disabled={!selectedZoneId || isAssigning}>{isAssigning ? 'A atribuir...' : 'Atribuir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
