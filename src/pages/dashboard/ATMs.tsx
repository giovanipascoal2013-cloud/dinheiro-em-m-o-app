import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Search, Banknote, MoreVertical, Edit, Trash2, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, WrenchIcon, FileText
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { MiniMap } from '@/components/MiniMap';

interface ATM {
  id: string; bank_name: string; address: string; latitude: number; longitude: number;
  has_cash: boolean; has_paper: boolean | null; zone_id: string;
  last_updated: string; created_at: string; cidade: string | null;
  fila: string | null; provincia: string | null; status: string | null; obs: string | null;
}

interface Zone { id: string; name: string; }

export default function ATMsPage() {
  const { isAdmin, isSupervisor, isAgent, user } = useAuth();
  const isMobile = useIsMobile();
  const [atms, setAtms] = useState<ATM[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCidade, setFilterCidade] = useState<string>('all');
  const [filterOperacional, setFilterOperacional] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAtm, setEditingAtm] = useState<ATM | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    // If agent, only fetch ATMs from their zones
    let agentZoneIds: string[] | null = null;
    if (isAgent && !isAdmin && !isSupervisor && user) {
      const { data: agentZones } = await supabase.from('agent_zones').select('zone_id').eq('agent_id', user.id);
      agentZoneIds = agentZones?.map(az => az.zone_id) ?? [];
    }

    let atmsQuery = supabase.from('atms').select('*').eq('status_approval', 'approved').order('last_updated', { ascending: false });
    if (agentZoneIds !== null && agentZoneIds.length > 0) {
      atmsQuery = atmsQuery.in('zone_id', agentZoneIds);
    } else if (agentZoneIds !== null && agentZoneIds.length === 0) {
      setAtms([]); setZones([]); setIsLoading(false); return;
    }

    const [atmsResult, zonesResult] = await Promise.all([
      atmsQuery,
      supabase.from('zones').select('id, name'),
    ]);

    if (atmsResult.data) setAtms(atmsResult.data as ATM[]);
    if (zonesResult.data) setZones(zonesResult.data);
    setIsLoading(false);
  };

  const cidades = [...new Set(atms.map(a => a.cidade).filter(Boolean))] as string[];

  const filteredAtms = atms.filter(atm => {
    const matchesSearch = atm.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atm.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'all' || atm.zone_id === filterZone;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'with_cash' && atm.has_cash) || (filterStatus === 'no_cash' && !atm.has_cash);
    const matchesCidade = filterCidade === 'all' || atm.cidade === filterCidade;
    const matchesOperacional = filterOperacional === 'all' || atm.status === filterOperacional;
    return matchesSearch && matchesZone && matchesStatus && matchesCidade && matchesOperacional;
  });

  const getZoneName = (zoneId: string | null) => {
    if (!zoneId) return 'Sem zona';
    return zones.find(z => z.id === zoneId)?.name || 'Desconhecida';
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Sob Manutenção': return { icon: WrenchIcon, label: status, className: 'bg-warning/10 text-warning' };
      case 'Fora de Serviço': return { icon: AlertTriangle, label: status, className: 'bg-destructive/10 text-destructive' };
      default: return { icon: CheckCircle2, label: 'Operacional', className: 'bg-success/10 text-success' };
    }
  };

  const handleToggleStatus = async (atm: ATM) => {
    const { error } = await supabase.from('atms').update({ has_cash: !atm.has_cash, last_updated: new Date().toISOString() }).eq('id', atm.id);
    if (error) toast({ title: 'Erro ao actualizar', variant: 'destructive' });
    else { toast({ title: 'Estado actualizado' }); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este ATM?')) return;
    const { error } = await supabase.from('atms').delete().eq('id', id);
    if (!error) { toast({ title: 'ATM eliminado' }); fetchData(); }
    else toast({ title: 'Erro ao eliminar', variant: 'destructive' });
  };

  return (
    <DashboardLayout title="ATMs" subtitle="Gerir ATMs">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar ATMs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterCidade} onValueChange={setFilterCidade}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas cidades</SelectItem>
              {cidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOperacional} onValueChange={setFilterOperacional}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Operacional">Operacional</SelectItem>
              <SelectItem value="Sob Manutenção">Manutenção</SelectItem>
              <SelectItem value="Fora de Serviço">Fora Serviço</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue placeholder="Dinheiro" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with_cash">Com $</SelectItem>
              <SelectItem value="no_cash">Sem $</SelectItem>
            </SelectContent>
          </Select>
          {(isAdmin || isSupervisor) && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" />Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <ATMForm zones={zones} onSuccess={() => { setIsCreateOpen(false); fetchData(); }} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold text-foreground">{atms.length}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted-foreground">Com $</p>
          <p className="text-xl font-bold text-success">{atms.filter(a => a.has_cash).length}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted-foreground">Operacionais</p>
          <p className="text-xl font-bold text-foreground">{atms.filter(a => a.status === 'Operacional' || !a.status).length}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted-foreground">Fora Serviço</p>
          <p className="text-xl font-bold text-destructive">{atms.filter(a => a.status === 'Fora de Serviço').length}</p>
        </div>
      </div>

      {/* ATMs list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : filteredAtms.length === 0 ? (
        <div className="text-center py-12">
          <Banknote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{searchQuery ? 'Nenhum resultado' : 'Nenhum ATM encontrado'}</p>
        </div>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <div className="space-y-3">
          {filteredAtms.map(atm => {
            const statusBadge = getStatusBadge(atm.status);
            const StatusIcon = statusBadge.icon;
            return (
              <div key={atm.id} className="bg-card rounded-xl p-3 border border-border/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn("p-1.5 rounded-lg shrink-0", atm.has_cash ? "bg-success/10" : "bg-destructive/10")}>
                      <Banknote className={cn("h-3.5 w-3.5", atm.has_cash ? "text-success" : "text-destructive")} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{atm.bank_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{atm.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(atm)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    {(isAdmin || isSupervisor) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingAtm(atm)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(atm.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs", atm.has_cash ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {atm.has_cash ? '💰 Sim' : '💰 Não'}
                  </span>
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs", atm.has_paper ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    📄 {atm.has_paper ? 'Sim' : 'Não'}
                  </span>
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs", statusBadge.className)}>
                    <StatusIcon className="h-3 w-3" />{statusBadge.label}
                  </span>
                  {atm.fila && <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">🕐 {atm.fila}</span>}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{getZoneName(atm.zone_id)}</span>
                  <span>{formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt })}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop: Table layout */
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Banco</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Endereço</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Zona</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">$</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Papel</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actual.</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtms.map((atm, i) => {
                  const statusBadge = getStatusBadge(atm.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <tr key={atm.id} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/30", i % 2 === 0 ? "bg-transparent" : "bg-muted/10")}>
                      <td className="p-3"><span className="font-medium text-foreground text-sm">{atm.bank_name}</span></td>
                      <td className="p-3 text-muted-foreground text-xs max-w-[180px] truncate">{atm.address}</td>
                      <td className="p-3"><span className="px-1.5 py-0.5 bg-secondary rounded text-xs">{getZoneName(atm.zone_id)}</span></td>
                      <td className="p-3">
                        <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs", atm.has_cash ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                          {atm.has_cash ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs", atm.has_paper ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                          <FileText className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="p-3"><span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs", statusBadge.className)}><StatusIcon className="h-3 w-3" />{statusBadge.label}</span></td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt })}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(atm)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                          {(isAdmin || isSupervisor) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingAtm(atm)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(atm.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!editingAtm} onOpenChange={(open) => !open && setEditingAtm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editingAtm && <ATMForm atm={editingAtm} zones={zones} onSuccess={() => { setEditingAtm(null); fetchData(); }} />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ATMForm({ atm, zones, onSuccess }: { atm?: ATM; zones: Zone[]; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: atm?.bank_name || '',
    address: atm?.address || '',
    latitude: atm?.latitude?.toString() || '-8.8383',
    longitude: atm?.longitude?.toString() || '13.2344',
    zone_id: atm?.zone_id || '',
    has_cash: atm?.has_cash ?? true,
    has_paper: atm?.has_paper ?? true,
    cidade: atm?.cidade || '',
    provincia: atm?.provincia || '',
    fila: atm?.fila || '',
    status: atm?.status || 'Operacional',
    obs: atm?.obs || '',
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
      bank_name: formData.bank_name,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      has_cash: formData.has_cash,
      has_paper: formData.has_paper,
      cidade: formData.cidade || null,
      provincia: formData.provincia || null,
      fila: formData.fila || null,
      status: formData.status,
      obs: formData.obs || null,
      last_updated: new Date().toISOString(),
      zone_id: formData.zone_id || null,
    };

    try {
      if (atm) {
        const { error } = await supabase.from('atms').update(payload).eq('id', atm.id);
        if (error) throw error;
        toast({ title: 'ATM actualizado' });
      } else {
        const { error } = await supabase.from('atms').insert(payload);
        if (error) throw error;
        toast({ title: 'ATM criado' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{atm ? 'Editar ATM' : 'Novo ATM'}</DialogTitle>
        <DialogDescription>{atm ? 'Actualize os detalhes' : 'Preencha os detalhes do novo ATM'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4">
        <div><Label>Banco</Label><Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="BFA, BAI..." required /></div>
        <div><Label>Endereço</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Av. 4 de Fevereiro" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Cidade</Label><Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} placeholder="Luanda" /></div>
          <div><Label className="text-xs">Província</Label><Input value={formData.provincia} onChange={(e) => setFormData({ ...formData, provincia: e.target.value })} placeholder="Luanda" /></div>
        </div>
        <div>
          <Label>Zona</Label>
          <Select value={formData.zone_id || 'none'} onValueChange={(v) => setFormData({ ...formData, zone_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem zona</SelectItem>
              {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Localização (clique ou arraste)</Label>
          <MiniMap latitude={lat} longitude={lng} onPositionChange={handleMapChange} height="180px" />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><Label className="text-xs">Latitude</Label><Input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} required /></div>
            <div><Label className="text-xs">Longitude</Label><Input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} required /></div>
          </div>
        </div>

        <div>
          <Label>Fila</Label>
          <Select value={formData.fila || 'none'} onValueChange={(v) => setFormData({ ...formData, fila: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Fila" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem info</SelectItem>
              <SelectItem value="Pouca Gente ( 0 - 6 )">Pouca (0-6)</SelectItem>
              <SelectItem value="Moderado (7 - 13)">Moderado (7-13)</SelectItem>
              <SelectItem value="Muita Gente (+14)">Muita (+14)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estado Operacional</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Operacional">Operacional</SelectItem>
              <SelectItem value="Sob Manutenção">Manutenção</SelectItem>
              <SelectItem value="Fora de Serviço">Fora de Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div><Label>Observações</Label><Textarea value={formData.obs} onChange={(e) => setFormData({ ...formData, obs: e.target.value })} placeholder="Observações opcionais..." className="min-h-[60px]" /></div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><input type="checkbox" id="has_cash" checked={formData.has_cash} onChange={(e) => setFormData({ ...formData, has_cash: e.target.checked })} className="h-4 w-4" /><Label htmlFor="has_cash" className="font-normal text-sm">Dinheiro</Label></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="has_paper" checked={formData.has_paper} onChange={(e) => setFormData({ ...formData, has_paper: e.target.checked })} className="h-4 w-4" /><Label htmlFor="has_paper" className="font-normal text-sm">Papel</Label></div>
        </div>
      </div>
      <DialogFooter><Button type="submit" disabled={isSubmitting} size="sm">{isSubmitting ? 'A guardar...' : atm ? 'Actualizar' : 'Criar'}</Button></DialogFooter>
    </form>
  );
}
