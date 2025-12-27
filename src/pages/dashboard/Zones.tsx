import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  price_kz: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ZonesPage() {
  const { isAdmin, isSupervisor } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching zones:', error);
      toast({ title: 'Erro ao carregar zonas', variant: 'destructive' });
    } else {
      setZones(data || []);
    }
    setIsLoading(false);
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta zona?')) return;

    const { error } = await supabase.from('zones').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao eliminar zona', variant: 'destructive' });
    } else {
      toast({ title: 'Zona eliminada com sucesso' });
      fetchZones();
    }
  };

  return (
    <DashboardLayout title="Zonas" subtitle="Gerir zonas de ATMs">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar zonas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {(isAdmin || isSupervisor) && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Zona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ZoneForm 
                onSuccess={() => {
                  setIsCreateOpen(false);
                  fetchZones();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Zones grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma zona encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Tente uma pesquisa diferente' : 'Crie a primeira zona'}
          </p>
          {(isAdmin || isSupervisor) && !searchQuery && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Zona
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.map(zone => (
            <ZoneCard 
              key={zone.id} 
              zone={zone} 
              onEdit={() => setEditingZone(zone)}
              onDelete={() => handleDelete(zone.id)}
              canManage={isAdmin || isSupervisor}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingZone} onOpenChange={(open) => !open && setEditingZone(null)}>
        <DialogContent>
          {editingZone && (
            <ZoneForm 
              zone={editingZone}
              onSuccess={() => {
                setEditingZone(null);
                fetchZones();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ZoneCard({ 
  zone, 
  onEdit, 
  onDelete,
  canManage 
}: { 
  zone: Zone; 
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{zone.name}</h3>
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
              zone.status === 'active' 
                ? "bg-success/10 text-success" 
                : "bg-muted text-muted-foreground"
            )}>
              {zone.status === 'active' ? 'Activa' : 'Suspensa'}
            </span>
          </div>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {zone.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {zone.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-lg font-bold text-foreground">
          {zone.price_kz.toLocaleString()} KZ
        </span>
        <span className="text-xs text-muted-foreground">
          Lat: {zone.latitude.toFixed(4)}, Long: {zone.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

function ZoneForm({ 
  zone, 
  onSuccess 
}: { 
  zone?: Zone; 
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    description: zone?.description || '',
    latitude: zone?.latitude?.toString() || '-8.8383',
    longitude: zone?.longitude?.toString() || '13.2344',
    price_kz: zone?.price_kz?.toString() || '1500',
    status: zone?.status || 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      description: formData.description || null,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      price_kz: parseInt(formData.price_kz),
      status: formData.status,
    };

    try {
      if (zone) {
        const { error } = await supabase
          .from('zones')
          .update(payload)
          .eq('id', zone.id);
        
        if (error) throw error;
        toast({ title: 'Zona actualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('zones')
          .insert(payload);
        
        if (error) throw error;
        toast({ title: 'Zona criada com sucesso' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao guardar zona', 
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
        <DialogTitle>{zone ? 'Editar Zona' : 'Nova Zona'}</DialogTitle>
        <DialogDescription>
          {zone ? 'Actualize os detalhes da zona' : 'Preencha os detalhes da nova zona'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Centro de Luanda"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição da zona..."
          />
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price_kz">Preço (KZ)</Label>
            <Input
              id="price_kz"
              type="number"
              value={formData.price_kz}
              onChange={(e) => setFormData({ ...formData, price_kz: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
            >
              <option value="active">Activa</option>
              <option value="suspended">Suspensa</option>
            </select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'A guardar...' : zone ? 'Actualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
