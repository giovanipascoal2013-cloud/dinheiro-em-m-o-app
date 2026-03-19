import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Banknote, 
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  WrenchIcon,
  FileText
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ATM {
  id: string;
  bank_name: string;
  address: string;
  latitude: number;
  longitude: number;
  has_cash: boolean;
  has_paper: boolean | null;
  zone_id: string;
  last_updated: string;
  created_at: string;
  cidade: string | null;
  fila: string | null;
  provincia: string | null;
  status: string | null;
}

interface Zone {
  id: string;
  name: string;
}

export default function ATMsPage() {
  const { isAdmin, isSupervisor, isAgent } = useAuth();
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [atmsResult, zonesResult] = await Promise.all([
      supabase.from('atms').select('*').order('last_updated', { ascending: false }),
      supabase.from('zones').select('id, name'),
    ]);

    if (atmsResult.data) setAtms(atmsResult.data as ATM[]);
    if (zonesResult.data) setZones(zonesResult.data);
    setIsLoading(false);
  };

  const cidades = [...new Set(atms.map(a => a.cidade).filter(Boolean))] as string[];

  const filteredAtms = atms.filter(atm => {
    const matchesSearch = 
      atm.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atm.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'all' || atm.zone_id === filterZone;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'with_cash' && atm.has_cash) ||
      (filterStatus === 'no_cash' && !atm.has_cash);
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
      case 'Sob Manutenção':
        return { icon: WrenchIcon, label: status, className: 'bg-warning/10 text-warning' };
      case 'Fora de Serviço':
        return { icon: AlertTriangle, label: status, className: 'bg-destructive/10 text-destructive' };
      default:
        return { icon: CheckCircle2, label: 'Operacional', className: 'bg-success/10 text-success' };
    }
  };

  const handleToggleStatus = async (atm: ATM) => {
    const { error } = await supabase
      .from('atms')
      .update({ has_cash: !atm.has_cash, last_updated: new Date().toISOString() })
      .eq('id', atm.id);

    if (error) {
      toast({ title: 'Erro ao actualizar ATM', variant: 'destructive' });
    } else {
      toast({ title: 'Estado do ATM actualizado' });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar este ATM?')) return;

    const { error } = await supabase.from('atms').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao eliminar ATM', variant: 'destructive' });
    } else {
      toast({ title: 'ATM eliminado com sucesso' });
      fetchData();
    }
  };

  return (
    <DashboardLayout title="ATMs" subtitle="Gerir ATMs">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar ATMs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCidade} onValueChange={setFilterCidade}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Filtrar por cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cidades.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOperacional} onValueChange={setFilterOperacional}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Estado operacional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Operacional">Operacional</SelectItem>
            <SelectItem value="Sob Manutenção">Sob Manutenção</SelectItem>
            <SelectItem value="Fora de Serviço">Fora de Serviço</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Dinheiro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with_cash">Com dinheiro</SelectItem>
            <SelectItem value="no_cash">Sem dinheiro</SelectItem>
          </SelectContent>
        </Select>
        {(isAdmin || isSupervisor) && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo ATM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <ATMForm 
                zones={zones}
                onSuccess={() => {
                  setIsCreateOpen(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Total ATMs</p>
          <p className="text-2xl font-bold text-foreground">{atms.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Com dinheiro</p>
          <p className="text-2xl font-bold text-success">{atms.filter(a => a.has_cash).length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Operacionais</p>
          <p className="text-2xl font-bold text-foreground">{atms.filter(a => a.status === 'Operacional' || !a.status).length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Fora de Serviço</p>
          <p className="text-2xl font-bold text-destructive">{atms.filter(a => a.status === 'Fora de Serviço').length}</p>
        </div>
      </div>

      {/* ATMs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAtms.length === 0 ? (
        <div className="text-center py-12">
          <Banknote className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum ATM encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Tente uma pesquisa diferente' : 'Crie o primeiro ATM'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Banco</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Endereço</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Cidade</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Zona</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Dinheiro</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Papel</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Fila</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actualização</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtms.map((atm, index) => {
                  const statusBadge = getStatusBadge(atm.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <tr 
                      key={atm.id}
                      className={cn(
                        "border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            atm.has_cash ? "bg-success/10" : "bg-destructive/10"
                          )}>
                            <Banknote className={cn(
                              "h-4 w-4",
                              atm.has_cash ? "text-success" : "text-destructive"
                            )} />
                          </div>
                          <span className="font-medium text-foreground">{atm.bank_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-[200px] truncate">{atm.address}</td>
                      <td className="p-4 text-muted-foreground text-sm">{atm.cidade || '—'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground">
                          {getZoneName(atm.zone_id)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          atm.has_cash 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {atm.has_cash ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {atm.has_cash ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          atm.has_paper
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          <FileText className="h-3 w-3" />
                          {atm.has_paper ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{atm.fila || '—'}</td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          statusBadge.className
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(atm.last_updated), { addSuffix: true, locale: pt })}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleStatus(atm)}
                            title={atm.has_cash ? 'Marcar sem dinheiro' : 'Marcar com dinheiro'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          {(isAdmin || isSupervisor) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingAtm(atm)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(atm.id)} 
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
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

      {/* Edit dialog */}
      <Dialog open={!!editingAtm} onOpenChange={(open) => !open && setEditingAtm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editingAtm && (
            <ATMForm 
              atm={editingAtm}
              zones={zones}
              onSuccess={() => {
                setEditingAtm(null);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ATMForm({ 
  atm, 
  zones,
  onSuccess 
}: { 
  atm?: ATM; 
  zones: Zone[];
  onSuccess: () => void;
}) {
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
  });

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
      last_updated: new Date().toISOString(),
    };
    payload.zone_id = formData.zone_id || null;

    try {
      if (atm) {
        const { error } = await supabase
          .from('atms')
          .update(payload)
          .eq('id', atm.id);
        
        if (error) throw error;
        toast({ title: 'ATM actualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('atms')
          .insert(payload);
        
        if (error) throw error;
        toast({ title: 'ATM criado com sucesso' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao guardar ATM', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{atm ? 'Editar ATM' : 'Novo ATM'}</DialogTitle>
        <DialogDescription>
          {atm ? 'Actualize os detalhes do ATM' : 'Preencha os detalhes do novo ATM'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="bank_name">Nome do Banco</Label>
          <Input
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            placeholder="BFA, BAI, BIC..."
            required
          />
        </div>

        <div>
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Av. 4 de Fevereiro, 123"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              placeholder="Luanda, Benguela..."
            />
          </div>
          <div>
            <Label htmlFor="provincia">Província</Label>
            <Input
              id="provincia"
              value={formData.provincia}
              onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
              placeholder="Luanda, Benguela..."
            />
          </div>
        </div>

        <div>
          <Label htmlFor="zone_id">Zona (opcional)</Label>
          <Select 
            value={formData.zone_id || 'none'} 
            onValueChange={(value) => setFormData({ ...formData, zone_id: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione uma zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem zona (atribuir depois)</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="fila">Fila</Label>
          <Select 
            value={formData.fila || 'none'}
            onValueChange={(value) => setFormData({ ...formData, fila: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nível de fila" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem informação</SelectItem>
              <SelectItem value="Pouca Gente ( 0 - 6 )">Pouca Gente (0-6)</SelectItem>
              <SelectItem value="Moderado (7 - 13)">Moderado (7-13)</SelectItem>
              <SelectItem value="Muita Gente (+14)">Muita Gente (+14)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Estado Operacional</Label>
          <Select 
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Operacional">Operacional</SelectItem>
              <SelectItem value="Sob Manutenção">Sob Manutenção</SelectItem>
              <SelectItem value="Fora de Serviço">Fora de Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_cash"
              checked={formData.has_cash}
              onChange={(e) => setFormData({ ...formData, has_cash: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="has_cash" className="font-normal">Tem dinheiro</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_paper"
              checked={formData.has_paper}
              onChange={(e) => setFormData({ ...formData, has_paper: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="has_paper" className="font-normal">Tem papel</Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'A guardar...' : atm ? 'Actualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
