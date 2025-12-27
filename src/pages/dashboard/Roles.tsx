import { useEffect, useState } from 'react';
import { Search, Shield, Plus, Trash2 } from 'lucide-react';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newRole, setNewRole] = useState({ user_id: '', role: 'agent' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from('user_roles').select(`*, profiles:user_id (nome, telefone)`),
      supabase.from('profiles').select('user_id, nome, telefone'),
    ]);
    setRoles(rolesRes.data || []);
    setProfiles(profilesRes.data || []);
    setIsLoading(false);
  };

  const handleAddRole = async () => {
    if (!newRole.user_id || !newRole.role) return;
    
    const { error } = await supabase.from('user_roles').insert({
      user_id: newRole.user_id,
      role: newRole.role as any,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar role', variant: 'destructive' });
    } else {
      toast({ title: 'Role adicionado com sucesso' });
      setIsAddOpen(false);
      fetchData();
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta role?')) return;
    await supabase.from('user_roles').delete().eq('id', id);
    toast({ title: 'Role removido' });
    fetchData();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    agent: 'Agente',
  };

  return (
    <DashboardLayout title="Gestão de Roles" subtitle="Atribuir roles aos utilizadores">
      <div className="flex gap-4 mb-6">
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Role
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
          {roles.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{r.profiles?.nome || 'Utilizador'}</p>
                  <p className="text-sm text-muted-foreground">{r.profiles?.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  r.role === 'admin' ? "bg-destructive/10 text-destructive" :
                  r.role === 'supervisor' ? "bg-warning/10 text-warning" :
                  "bg-accent/10 text-accent"
                )}>
                  {roleLabels[r.role] || r.role}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Utilizador</Label>
              <Select value={newRole.user_id} onValueChange={(v) => setNewRole({ ...newRole, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.nome || p.telefone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole.role} onValueChange={(v) => setNewRole({ ...newRole, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddRole}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
