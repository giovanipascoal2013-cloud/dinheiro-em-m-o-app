import { useEffect, useState, useMemo } from 'react';
import { Search, MapPin, Banknote, Users, ArrowRight, X, ChevronDown, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ATMRow {
  id: string; bank_name: string; address: string; zone_id: string | null;
  cidade: string | null; provincia: string | null; has_cash: boolean;
}
interface ZoneRow { id: string; name: string; status: string; }
interface AgentRow {
  user_id: string; nome: string | null; telefone: string;
  provincia: string | null; cidade: string | null;
  zones: { zone_id: string; zone_name: string; referral_code: string; az_id: string }[];
}

export default function AssignmentsPage() {
  const [atms, setAtms] = useState<ATMRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ATM→Zone tab state
  const [atmSearch, setAtmSearch] = useState('');
  const [atmFilter, setAtmFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [selectedAtms, setSelectedAtms] = useState<Set<string>>(new Set());
  const [assignZoneDialogOpen, setAssignZoneDialogOpen] = useState(false);
  const [targetZoneId, setTargetZoneId] = useState('');

  // Zone→Agent tab state
  const [agentSearch, setAgentSearch] = useState('');
  const [assignAgentDialogOpen, setAssignAgentDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [targetAgentZoneId, setTargetAgentZoneId] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [atmsRes, zonesRes, rolesRes] = await Promise.all([
      supabase.from('atms').select('id, bank_name, address, zone_id, cidade, provincia, has_cash').order('bank_name'),
      supabase.from('zones').select('id, name, status').order('name'),
      supabase.from('user_roles').select('user_id').eq('role', 'agent'),
    ]);

    const agentIds = (rolesRes.data || []).map((r: any) => r.user_id);
    let agentsData: AgentRow[] = [];

    if (agentIds.length > 0) {
      const [profilesRes, azRes] = await Promise.all([
        supabase.from('profiles').select('user_id, nome, telefone, provincia, cidade').in('user_id', agentIds),
        supabase.from('agent_zones').select('id, agent_id, zone_id, referral_code').in('agent_id', agentIds),
      ]);
      const zoneMap = new Map((zonesRes.data || []).map(z => [z.id, z.name]));
      agentsData = (profilesRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        nome: p.nome,
        telefone: p.telefone,
        provincia: p.provincia,
        cidade: p.cidade,
        zones: (azRes.data || [])
          .filter((az: any) => az.agent_id === p.user_id)
          .map((az: any) => ({
            zone_id: az.zone_id,
            zone_name: zoneMap.get(az.zone_id) || 'Desconhecida',
            referral_code: az.referral_code,
            az_id: az.id,
          })),
      }));
    }

    setAtms((atmsRes.data || []) as ATMRow[]);
    setZones(zonesRes.data || []);
    setAgents(agentsData);
    setLoading(false);
  };

  // ---- ATM → Zone logic ----
  const filteredAtms = useMemo(() => {
    let result = atms;
    if (atmSearch) {
      const q = atmSearch.toLowerCase();
      result = result.filter(a => a.bank_name.toLowerCase().includes(q) || a.address.toLowerCase().includes(q) || a.cidade?.toLowerCase().includes(q));
    }
    if (atmFilter === 'unassigned') result = result.filter(a => !a.zone_id);
    if (atmFilter === 'assigned') result = result.filter(a => !!a.zone_id);
    return result;
  }, [atms, atmSearch, atmFilter]);

  const toggleAtm = (id: string) => {
    setSelectedAtms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedAtms(new Set(filteredAtms.map(a => a.id)));
  };

  const handleAssignAtmsToZone = async () => {
    if (!targetZoneId || selectedAtms.size === 0) return;
    const ids = Array.from(selectedAtms);
    const { error } = await supabase.from('atms').update({ zone_id: targetZoneId }).in('id', ids);
    if (error) {
      toast({ title: 'Erro ao atribuir ATMs', description: error.message, variant: 'destructive' });
    } else {
      // If zone has no coords, update with first ATM coords
      const zone = zones.find(z => z.id === targetZoneId);
      if (zone) {
        const firstAtm = atms.find(a => ids.includes(a.id));
        if (firstAtm) {
          // Check if zone has default coords
          const { data: zoneData } = await supabase.from('zones').select('latitude, longitude').eq('id', targetZoneId).single();
          if (zoneData && zoneData.latitude === 0 && zoneData.longitude === 0) {
            const { data: atmFull } = await supabase.from('atms').select('latitude, longitude').eq('id', firstAtm.id).single();
            if (atmFull) {
              await supabase.from('zones').update({ latitude: atmFull.latitude, longitude: atmFull.longitude }).eq('id', targetZoneId);
            }
          }
        }
      }
      toast({ title: `${ids.length} ATM(s) atribuído(s) à zona` });
      setSelectedAtms(new Set());
      setAssignZoneDialogOpen(false);
      setTargetZoneId('');
      fetchAll();
    }
  };

  const handleRemoveAtmFromZone = async (atmId: string) => {
    const { error } = await supabase.from('atms').update({ zone_id: null }).eq('id', atmId);
    if (!error) { toast({ title: 'ATM removido da zona' }); fetchAll(); }
  };

  // ---- Zone → Agent logic ----
  const filteredAgents = useMemo(() => {
    if (!agentSearch) return agents;
    const q = agentSearch.toLowerCase();
    return agents.filter(a =>
      a.nome?.toLowerCase().includes(q) || a.telefone.includes(q) ||
      a.provincia?.toLowerCase().includes(q) || a.cidade?.toLowerCase().includes(q) ||
      a.zones.some(z => z.zone_name.toLowerCase().includes(q))
    );
  }, [agents, agentSearch]);

  const handleAssignZoneToAgent = async () => {
    if (!selectedAgentId || !targetAgentZoneId) return;
    // Check if zone already has an agent (UNIQUE constraint)
    const existingAgent = agents.find(a => a.zones.some(z => z.zone_id === targetAgentZoneId));
    if (existingAgent) {
      toast({ title: 'Esta zona já tem um agente atribuído', description: `Agente: ${existingAgent.nome || existingAgent.telefone}. Remova-o primeiro.`, variant: 'destructive' });
      return;
    }
    // Check if this agent already has this zone
    const agent = agents.find(a => a.user_id === selectedAgentId);
    if (agent?.zones.some(z => z.zone_id === targetAgentZoneId)) {
      toast({ title: 'Zona já atribuída a este agente', variant: 'destructive' });
      return;
    }

    const { data: codeData } = await supabase.rpc('generate_referral_code');
    const { error } = await supabase.from('agent_zones').insert({
      agent_id: selectedAgentId,
      zone_id: targetAgentZoneId,
      referral_code: codeData || `REF${Date.now()}`,
    });

    if (error) {
      toast({ title: 'Erro ao atribuir zona', description: error.message, variant: 'destructive' });
    } else {
      // Activate zone if suspended
      const zone = zones.find(z => z.id === targetAgentZoneId);
      if (zone && zone.status !== 'active') {
        await supabase.from('zones').update({ status: 'active' }).eq('id', targetAgentZoneId);
      }
      toast({ title: 'Zona atribuída ao agente' });
      setAssignAgentDialogOpen(false);
      setSelectedAgentId('');
      setTargetAgentZoneId('');
      fetchAll();
    }
  };

  const handleRemoveZoneFromAgent = async (azId: string) => {
    const { error } = await supabase.from('agent_zones').delete().eq('id', azId);
    if (!error) { toast({ title: 'Zona removida do agente' }); fetchAll(); }
    else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
  };

  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || 'Sem zona';

  const unassignedAtmCount = atms.filter(a => !a.zone_id).length;
  const unassignedZoneAgents = zones.filter(z => !agents.some(a => a.zones.some(az => az.zone_id === z.id)));

  return (
    <DashboardLayout title="Atribuições" subtitle="Gerir atribuições de ATMs e zonas">
      <Tabs defaultValue="atm-zone" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="atm-zone" className="text-xs sm:text-sm gap-1">
            <Banknote className="h-3.5 w-3.5" />ATMs → Zonas
            {unassignedAtmCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{unassignedAtmCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="zone-agent" className="text-xs sm:text-sm gap-1">
            <Users className="h-3.5 w-3.5" />Zonas → Agentes
            {unassignedZoneAgents.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{unassignedZoneAgents.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== ATMs → Zonas ===== */}
        <TabsContent value="atm-zone" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar ATMs..." value={atmSearch} onChange={e => setAtmSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={atmFilter} onValueChange={(v: any) => setAtmFilter(v)}>
              <SelectTrigger className="w-full sm:w-40 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({atms.length})</SelectItem>
                <SelectItem value="unassigned">Sem zona ({unassignedAtmCount})</SelectItem>
                <SelectItem value="assigned">Com zona ({atms.length - unassignedAtmCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection bar */}
          {selectedAtms.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-foreground">{selectedAtms.size} seleccionado(s)</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedAtms(new Set())}>
                <X className="h-3 w-3 mr-1" />Limpar
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => setAssignZoneDialogOpen(true)}>
                <ArrowRight className="h-3 w-3 mr-1" />Atribuir a zona
              </Button>
            </div>
          )}

          {selectedAtms.size === 0 && filteredAtms.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={selectAllVisible}>
              Seleccionar todos ({filteredAtms.length})
            </Button>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-card rounded-lg animate-pulse" />)}</div>
          ) : filteredAtms.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum ATM encontrado</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {filteredAtms.map(atm => (
                <div
                  key={atm.id}
                  onClick={() => toggleAtm(atm.id)}
                  className={cn(
                    "flex items-center gap-3 bg-card rounded-lg p-3 border cursor-pointer transition-all hover:shadow-sm",
                    selectedAtms.has(atm.id) ? "border-primary bg-primary/5" : "border-border/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedAtms.has(atm.id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedAtms.has(atm.id) && <span className="text-primary-foreground text-xs">✓</span>}
                  </div>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", atm.has_cash ? "bg-success" : "bg-destructive")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{atm.bank_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{atm.address}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {atm.zone_id ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">{getZoneName(atm.zone_id)}</Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveAtmFromZone(atm.id); }}
                          className="p-0.5 rounded hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-warning font-medium">Sem zona</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== Zonas → Agentes ===== */}
        <TabsContent value="zone-agent" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar agentes..." value={agentSearch} onChange={e => setAgentSearch(e.target.value)} className="pl-10" />
            </div>
            <Button size="sm" onClick={() => setAssignAgentDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Atribuir Zona
            </Button>
          </div>

          {/* Zones without agents */}
          {unassignedZoneAgents.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
              <p className="text-xs font-medium text-warning mb-2">Zonas sem agente ({unassignedZoneAgents.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {unassignedZoneAgents.map(z => (
                  <Badge key={z.id} variant="outline" className="text-[10px] border-warning/30 text-warning">
                    <MapPin className="h-3 w-3 mr-0.5" />{z.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />)}</div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum agente encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAgents.map(agent => (
                <div key={agent.user_id} className="bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">{agent.nome?.charAt(0) || 'A'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">{agent.nome || 'Agente'}</p>
                      <p className="text-xs text-muted-foreground">{agent.telefone}</p>
                      {(agent.provincia || agent.cidade) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[agent.cidade, agent.provincia].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs shrink-0"
                      onClick={() => {
                        setSelectedAgentId(agent.user_id);
                        setTargetAgentZoneId('');
                        setAssignAgentDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />Zona
                    </Button>
                  </div>
                  {agent.zones.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.zones.map(z => (
                        <Badge key={z.az_id} variant="secondary" className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{z.zone_name}
                          <span className="text-[10px] text-muted-foreground font-mono ml-0.5">{z.referral_code}</span>
                          <button
                            onClick={() => handleRemoveZoneFromAgent(z.az_id)}
                            className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhuma zona atribuída</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign ATMs to Zone dialog */}
      <Dialog open={assignZoneDialogOpen} onOpenChange={setAssignZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir {selectedAtms.size} ATM(s) a uma zona</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={targetZoneId} onValueChange={setTargetZoneId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar zona..." /></SelectTrigger>
              <SelectContent>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignZoneDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAssignAtmsToZone} disabled={!targetZoneId}>Atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Zone to Agent dialog */}
      <Dialog open={assignAgentDialogOpen} onOpenChange={setAssignAgentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir zona a agente</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!selectedAgentId && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Agente</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.nome || a.telefone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Zona</label>
              <Select value={targetAgentZoneId} onValueChange={setTargetAgentZoneId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar zona..." /></SelectTrigger>
                <SelectContent>
                  {zones
                    .filter(z => !agents.find(a => a.user_id === selectedAgentId)?.zones.some(az => az.zone_id === z.id))
                    .map(z => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name} {z.status !== 'active' && <span className="text-muted-foreground">(suspensa)</span>}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setAssignAgentDialogOpen(false); setSelectedAgentId(''); }}>Cancelar</Button>
            <Button size="sm" onClick={handleAssignZoneToAgent} disabled={!selectedAgentId || !targetAgentZoneId}>Atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
