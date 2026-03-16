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
  XCircle
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
  zone_id: string;
  last_updated: string;
  created_at: string;
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

    if (atmsResult.data) setAtms(atmsResult.data);
    if (zonesResult.data) setZones(zonesResult.data);
    setIsLoading(false);
  };

  const filteredAtms = atms.filter(atm => {
    const matchesSearch = 
      atm.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atm.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'all' || atm.zone_id === filterZone;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'with_cash' && atm.has_cash) ||
      (filterStatus === 'no_cash' && !atm.has_cash);
    
    return matchesSearch && matchesZone && matchesStatus;
  });

  const getZoneName = (zoneId: string) => {
    return zones.find(z => z.id === zoneId)?.name || 'Desconhecida';
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
        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Filtrar por zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as zonas</SelectItem>
            {zones.map(zone => (
              <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
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
            <DialogContent>
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
                  <th className="text-left p-4 font-medium text-muted-foreground">Zona</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Última Actualização</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtms.map((atm, index) => (
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
                    <td className="p-4 text-muted-foreground">{atm.address}</td>
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
                        {atm.has_cash ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Com dinheiro
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Sem dinheiro
                          </>
                        )}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingAtm} onOpenChange={(open) => !open && setEditingAtm(null)}>
        <DialogContent>
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: any = {
      bank_name: formData.bank_name,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      has_cash: formData.has_cash,
      last_updated: new Date().toISOString(),
    };
    if (formData.zone_id) {
      payload.zone_id = formData.zone_id;
    } else {
      payload.zone_id = null;
    }

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

        <div>
          <Label htmlFor="zone_id">Zona</Label>
          <Select 
            value={formData.zone_id} 
            onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione uma zona" />
            </SelectTrigger>
            <SelectContent>
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
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'A guardar...' : atm ? 'Actualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
