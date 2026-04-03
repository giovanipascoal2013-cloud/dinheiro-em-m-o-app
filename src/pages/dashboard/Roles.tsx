import { useEffect, useState, useMemo } from 'react';
import { Search, Shield, ShieldCheck, ShieldAlert, Plus, Trash2, Users, UserCog, Crown, Loader2, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; colorClass: string; bgClass: string; description: string }> = {
  admin: {
    label: 'Administrador',
    icon: Crown,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10 border-destructive/20',
    description: 'Acesso total ao sistema',
  },
  supervisor: {
    label: 'Supervisor',
    icon: ShieldCheck,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    description: 'Gestão de zonas, ATMs e agentes',
  },
  agent: {
    label: 'Agente',
    icon: ShieldAlert,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
    description: 'Gestão de ATMs atribuídos',
  },
};

type FilterRole = 'all' | 'admin' | 'supervisor' | 'agent';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState({ user_id: '', role: 'agent' });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from('user_roles').select('*'),
      supabase.from('profiles').select('user_id, nome, telefone, provincia, cidade'),
    ]);
    setRoles(rolesRes.data || []);
    setProfiles(profilesRes.data || []);
    setIsLoading(false);
  };

  const profileMap = useMemo(() => {
    const map = new Map<string, any>();
    profiles.forEach(p => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  const enrichedRoles = useMemo(() => {
    return roles.map(r => ({
      ...r,
      profile: profileMap.get(r.user_id) || null,
    }));
  }, [roles, profileMap]);

  const filteredRoles = useMemo(() => {
    return enrichedRoles.filter(r => {
      if (filterRole !== 'all' && r.role !== filterRole) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (r.profile?.nome || '').toLowerCase();
        const phone = (r.profile?.telefone || '').toLowerCase();
        const prov = (r.profile?.provincia || '').toLowerCase();
        const city = (r.profile?.cidade || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !prov.includes(q) && !city.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedRoles, filterRole, search]);

  const stats = useMemo(() => ({
    total: roles.length,
    admin: roles.filter(r => r.role === 'admin').length,
    supervisor: roles.filter(r => r.role === 'supervisor').length,
    agent: roles.filter(r => r.role === 'agent').length,
  }), [roles]);

  // Users who don't already have the selected role
  const availableUsers = useMemo(() => {
    const usersWithRole = new Set(roles.filter(r => r.role === newRole.role).map(r => r.user_id));
    return profiles.filter(p => !usersWithRole.has(p.user_id));
  }, [profiles, roles, newRole.role]);

  const handleAddRole = async () => {
    if (!newRole.user_id || !newRole.role) return;
    setIsAdding(true);

    const { error } = await supabase.from('user_roles').insert({
      user_id: newRole.user_id,
      role: newRole.role as any,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Este utilizador já possui este cargo', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao adicionar cargo', description: error.message, variant: 'destructive' });
      }
    } else {
      const user = profileMap.get(newRole.user_id);
      toast({ title: `Cargo atribuído a ${user?.nome || 'utilizador'}` });
      setIsAddOpen(false);
      setNewRole({ user_id: '', role: 'agent' });
      fetchData();
    }
    setIsAdding(false);
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', removeTarget.id);
    if (error) {
      toast({ title: 'Erro ao remover cargo', variant: 'destructive' });
    } else {
      toast({ title: `Cargo removido de ${removeTarget.name}` });
      fetchData();
    }
    setRemoveTarget(null);
  };

  const StatCard = ({ label, value, icon: Icon, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[120px] p-4 rounded-xl border transition-all text-left",
        active
          ? "bg-primary/10 border-primary/30 shadow-sm"
          : "bg-card border-border/50 hover:border-primary/20 hover:bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", active ? "text-primary" : "text-foreground")}>{value}</p>
    </button>
  );

  return (
    <DashboardLayout title="Gestão de Cargos" subtitle="Atribua e gerencie cargos dos utilizadores">
      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard label="Total" value={stats.total} icon={Users} active={filterRole === 'all'} onClick={() => setFilterRole('all')} />
        <StatCard label="Administradores" value={stats.admin} icon={Crown} active={filterRole === 'admin'} onClick={() => setFilterRole('admin')} />
        <StatCard label="Supervisores" value={stats.supervisor} icon={ShieldCheck} active={filterRole === 'supervisor'} onClick={() => setFilterRole('supervisor')} />
        <StatCard label="Agentes" value={stats.agent} icon={ShieldAlert} active={filterRole === 'agent'} onClick={() => setFilterRole('agent')} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone, província..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setNewRole({ user_id: '', role: 'agent' }); setIsAddOpen(true); }} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Atribuir Cargo
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[72px] bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search || filterRole !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum cargo atribuído'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_48px] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Utilizador</span>
            <span>Cargo</span>
            <span>Localização</span>
            <span>Atribuído em</span>
            <span />
          </div>
          <div className="divide-y divide-border/50">
            {filteredRoles.map(r => {
              const config = ROLE_CONFIG[r.role] || ROLE_CONFIG.agent;
              const RoleIcon = config.icon;
              return (
                <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_48px] gap-2 sm:gap-4 items-center p-4 hover:bg-muted/20 transition-colors">
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 border", config.bgClass)}>
                      <RoleIcon className={cn("h-4 w-4", config.colorClass)} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.profile?.nome || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.profile?.telefone || '—'}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div>
                    <Badge variant="outline" className={cn("text-xs border", config.bgClass, config.colorClass)}>
                      {config.label}
                    </Badge>
                  </div>

                  {/* Location */}
                  <p className="text-sm text-muted-foreground truncate">
                    {[r.profile?.cidade, r.profile?.provincia].filter(Boolean).join(', ') || '—'}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('pt-AO')}
                  </p>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveTarget({ id: r.id, name: r.profile?.nome || 'Utilizador', role: config.label })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Footer count */}
          <div className="px-4 py-2.5 bg-muted/20 border-t border-border/50 text-xs text-muted-foreground">
            {filteredRoles.length} de {roles.length} cargo{roles.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Atribuir Cargo
            </DialogTitle>
            <DialogDescription>
              Selecione o utilizador e o cargo que pretende atribuir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Role selection first — drives available users */}
            <div className="space-y-2">
              <Label>Cargo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['agent', 'supervisor', 'admin'] as const).map(role => {
                  const config = ROLE_CONFIG[role];
                  const Icon = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => setNewRole({ ...newRole, role, user_id: '' })}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                        newRole.role === role
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", newRole.role === role ? config.colorClass : "text-muted-foreground")} />
                      <span className="text-xs font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{ROLE_CONFIG[newRole.role]?.description}</p>
            </div>

            <div className="space-y-2">
              <Label>Utilizador</Label>
              <Select value={newRole.user_id} onValueChange={v => setNewRole({ ...newRole, user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um utilizador" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Todos os utilizadores já possuem este cargo
                    </div>
                  ) : (
                    availableUsers.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        <div className="flex flex-col">
                          <span>{p.nome || p.telefone}</span>
                          {p.nome && <span className="text-xs text-muted-foreground">{p.telefone}</span>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddRole} disabled={!newRole.user_id || isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover o cargo <strong>{removeTarget?.role}</strong> de <strong>{removeTarget?.name}</strong>? Esta acção não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
