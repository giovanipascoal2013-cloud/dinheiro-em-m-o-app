import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Plus, Search, MapPin, MoreVertical, Edit, Trash2, Banknote,
  Users, ClipboardCheck, TrendingUp, ToggleLeft, ToggleRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MiniMap } from '@/components/MiniMap';
import { usePricePerAtm } from '@/hooks/usePricePerAtm';

interface Zone {
  id: string; name: string; description: string | null;
  latitude: number; longitude: number; price_kz: number;
  status: string; created_at: string; updated_at: string;
}

interface ZoneDetailData {
  atms: { id: string; bank_name: string; address: string; has_cash: boolean; has_paper: boolean | null; status: string | null; last_updated: string }[];
  subscriptionCount: number;
  activeSubCount: number;
  expiredSubCount: number;
  totalBilling: number;
  agents: { agent_id: string; nome: string | null; referral_code: string }[];
}

export default function ZonesPage() {
  const { isAdmin, isSupervisor } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [detailZone, setDetailZone] = useState<Zone | null>(null);
  const [zoneDetail, setZoneDetail] = useState<ZoneDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from('zones').select('*').order('created_at', { ascending: false });
    if (!error) setZones(data || []);
    setIsLoading(false);
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta zona?')) return;
    const { error } = await supabase.from('zones').delete().eq('id', id);
    if (!error) { toast({ title: 'Zona eliminada' }); fetchZones(); }
    else toast({ title: 'Erro ao eliminar', variant: 'destructive' });
  };

  const handleToggleStatus = async (zone: Zone, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = zone.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('zones').update({ status: newStatus }).eq('id', zone.id);
    if (!error) { toast({ title: `Zona ${newStatus === 'active' ? 'activada' : 'suspensa'}` }); fetchZones(); }
  };

  const openDetail = async (zone: Zone) => {
    setDetailZone(zone);
    setDetailLoading(true);
    setZoneDetail(null);

    const [atmsRes, activeSubs, expiredSubs, agentZonesRes] = await Promise.all([
      supabase.from('atms').select('id, bank_name, address, has_cash, has_paper, status, last_updated').eq('zone_id', zone.id),
      supabase.from('subscriptions').select('amount_kz').eq('zone_id', zone.id).eq('status', 'active'),
      supabase.from('subscriptions').select('amount_kz').eq('zone_id', zone.id).eq('status', 'expired'),
      supabase.from('agent_zones').select('agent_id, referral_code').eq('zone_id', zone.id),
    ]);

    const agentIds = agentZonesRes.data?.map(a => a.agent_id) || [];
    let agents: ZoneDetailData['agents'] = [];
    if (agentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, nome').in('user_id', agentIds);
      agents = (agentZonesRes.data || []).map(az => ({
        agent_id: az.agent_id,
        nome: profiles?.find(p => p.user_id === az.agent_id)?.nome || null,
        referral_code: az.referral_code,
      }));
    }

    const allSubs = [...(activeSubs.data || []), ...(expiredSubs.data || [])];
    setZoneDetail({
      atms: (atmsRes.data || []) as ZoneDetailData['atms'],
      subscriptionCount: allSubs.length,
      activeSubCount: activeSubs.data?.length || 0,
      expiredSubCount: expiredSubs.data?.length || 0,
      totalBilling: allSubs.reduce((sum, s) => sum + Number(s.amount_kz), 0),
      agents,
    });
    setDetailLoading(false);
  };

  return (
    <DashboardLayout title="Zonas" subtitle="Gerir zonas de ATMs">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar zonas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {(isAdmin || isSupervisor) && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Zona</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <ZoneForm onSuccess={() => { setIsCreateOpen(false); fetchZones(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma zona encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.map(zone => (
            <ZoneCard 
              key={zone.id} zone={zone}
              onEdit={() => setEditingZone(zone)}
              onDelete={() => handleDelete(zone.id)}
              onClick={() => openDetail(zone)}
              onToggleStatus={(e) => handleToggleStatus(zone, e)}
              canManage={isAdmin || isSupervisor}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingZone} onOpenChange={(open) => !open && setEditingZone(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editingZone && <ZoneForm zone={editingZone} onSuccess={() => { setEditingZone(null); fetchZones(); }} />}
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailZone} onOpenChange={(open) => !open && setDetailZone(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {detailZone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {detailZone.name}
                </DialogTitle>
                <DialogDescription>{detailZone.description || 'Sem descrição'}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between mt-2">
                <Badge variant={detailZone.status === 'active' ? 'default' : 'secondary'}>
                  {detailZone.status === 'active' ? 'Activa' : 'Suspensa'}
                </Badge>
                <span className="text-lg font-bold text-foreground">
                  {detailZone.price_kz > 0 
                    ? `${detailZone.price_kz.toLocaleString()} KZ` 
                    : zoneDetail ? `${(zoneDetail.atms.length * 500).toLocaleString()} KZ (auto)` : 'A calcular'}
                </span>
              </div>

              {detailLoading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : zoneDetail && (
                <Tabs defaultValue="resumo" className="mt-4">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
                    <TabsTrigger value="atms" className="text-xs">ATMs</TabsTrigger>
                    <TabsTrigger value="subs" className="text-xs">Adesões</TabsTrigger>
                    <TabsTrigger value="agentes" className="text-xs">Agentes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="resumo" className="space-y-4 mt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MiniStat icon={Banknote} label="ATMs" value={zoneDetail.atms.length} />
                      <MiniStat icon={ClipboardCheck} label="Adesões" value={zoneDetail.subscriptionCount} />
                      <MiniStat icon={Users} label="Agentes" value={zoneDetail.agents.length} />
                      <MiniStat icon={TrendingUp} label="Receita" value={`${zoneDetail.totalBilling.toLocaleString()} KZ`} />
                    </div>
                    {zoneDetail.atms.length > 0 && (
                      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{zoneDetail.atms[0].address}{zoneDetail.atms.length > 1 ? ` (+${zoneDetail.atms.length - 1} endereços)` : ''}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Coordenadas: {detailZone.latitude.toFixed(4)}, {detailZone.longitude.toFixed(4)}
                    </div>
                  </TabsContent>

                  <TabsContent value="atms" className="mt-3">
                    {zoneDetail.atms.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum ATM nesta zona</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {zoneDetail.atms.map(atm => (
                          <div key={atm.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{atm.bank_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{atm.address}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {atm.has_paper === false && <span className="text-xs text-warning">📄✗</span>}
                              <Badge variant={atm.has_cash ? 'default' : 'destructive'} className="text-xs">
                                {atm.has_cash ? 'Com $' : 'Sem $'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="subs" className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{zoneDetail.subscriptionCount}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-success/5 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-success">{zoneDetail.activeSubCount}</p>
                        <p className="text-xs text-muted-foreground">Activas</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-muted-foreground">{zoneDetail.expiredSubCount}</p>
                        <p className="text-xs text-muted-foreground">Expiradas</p>
                      </div>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Facturação total</p>
                      <p className="text-xl font-bold text-foreground">{zoneDetail.totalBilling.toLocaleString()} KZ</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="agentes" className="mt-3">
                    {zoneDetail.agents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum agente atribuído</p>
                    ) : (
                      <div className="space-y-2">
                        {zoneDetail.agents.map(agent => (
                          <div key={agent.agent_id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 text-sm">
                            <span className="font-medium text-foreground">{agent.nome || 'Sem nome'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{agent.referral_code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ZoneCard({ zone, onEdit, onDelete, onClick, onToggleStatus, canManage }: { 
  zone: Zone; onEdit: () => void; onDelete: () => void; onClick: () => void;
  onToggleStatus: (e: React.MouseEvent) => void; canManage: boolean;
}) {
  return (
    <div onClick={onClick} className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{zone.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                zone.status === 'active' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              )}>
                {zone.status === 'active' ? 'Activa' : 'Suspensa'}
              </span>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleStatus} title={zone.status === 'active' ? 'Suspender' : 'Activar'}>
              {zone.status === 'active' ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {zone.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{zone.description}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-base font-bold text-foreground">
          {zone.price_kz > 0 ? `${zone.price_kz.toLocaleString()} KZ` : 'Auto (500 KZ/ATM)'}
        </span>
      </div>
    </div>
  );
}

function ZoneForm({ zone, onSuccess }: { zone?: Zone; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    description: zone?.description || '',
    latitude: zone?.latitude?.toString() || '',
    longitude: zone?.longitude?.toString() || '',
    price_kz: zone ? (zone.price_kz === 0 ? '' : zone.price_kz.toString()) : '',
    status: zone?.status || 'suspended',
  });

  const lat = parseFloat(formData.latitude) || -8.8383;
  const lng = parseFloat(formData.longitude) || 13.2344;

  const handleMapChange = useCallback((newLat: number, newLng: number) => {
    setFormData(prev => ({ ...prev, latitude: newLat.toString(), longitude: newLng.toString() }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      description: formData.description || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : 0,
      longitude: formData.longitude ? parseFloat(formData.longitude) : 0,
      price_kz: formData.price_kz ? parseInt(formData.price_kz) : 0,
      status: formData.status,
    };

    try {
      if (zone) {
        const { error } = await supabase.from('zones').update(payload).eq('id', zone.id);
        if (error) throw error;
        toast({ title: 'Zona actualizada' });
      } else {
        const { error } = await supabase.from('zones').insert(payload);
        if (error) throw error;
        toast({ title: 'Zona criada' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao guardar zona', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{zone ? 'Editar Zona' : 'Nova Zona'}</DialogTitle>
        <DialogDescription>{zone ? 'Actualize os detalhes' : 'Preencha os detalhes da nova zona'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Centro de Luanda" required />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição da zona..." />
        </div>

        <div>
          <Label>Localização (clique ou arraste o marcador)</Label>
          <MiniMap latitude={lat} longitude={lng} onPositionChange={handleMapChange} />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label htmlFor="latitude" className="text-xs">Latitude</Label>
              <Input id="latitude" type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} placeholder="Auto (1º ATM)" />
            </div>
            <div>
              <Label htmlFor="longitude" className="text-xs">Longitude</Label>
              <Input id="longitude" type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} placeholder="Auto (1º ATM)" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Deixe vazio para usar coordenadas do 1º ATM</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price_kz">Preço (KZ)</Label>
            <Input id="price_kz" type="number" value={formData.price_kz} onChange={(e) => setFormData({ ...formData, price_kz: e.target.value })} placeholder="Auto-calcular" />
            <p className="text-xs text-muted-foreground mt-1">Vazio = auto</p>
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm">
              <option value="suspended">Suspensa</option>
              <option value="active">Activa</option>
            </select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? 'A guardar...' : zone ? 'Actualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
