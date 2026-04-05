import { useEffect, useState } from 'react';
import { Search, Users, Shield, UserCog, KeyRound, Copy, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface UserWithRoles {
  id: string;
  user_id: string;
  nome: string | null;
  telefone: string;
  created_at: string;
  roles: string[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset password state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [tempPasswordDialogOpen, setTempPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (userRoles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.telefone?.includes(searchQuery)
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'supervisor': return 'default';
      case 'agent': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'supervisor': return 'Supervisor';
      case 'agent': return 'Agente';
      default: return 'Utilizador';
    }
  };

  const handleResetClick = (user: UserWithRoles) => {
    setSelectedUser(user);
    setConfirmDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedUser) return;
    setIsResetting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: selectedUser.user_id },
      });

      if (error) throw error;

      setConfirmDialogOpen(false);

      if (data.method === 'email') {
        toast.success('Link de redefinição enviado para o email do utilizador.');
      } else if (data.method === 'temporary') {
        setTempPassword(data.tempPassword);
        setTempPasswordDialogOpen(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redefinir a senha.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout title="Utilizadores" subtitle="Gerir todos os utilizadores registados">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar utilizadores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.roles.includes('admin')).length}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <UserCog className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.roles.includes('supervisor')).length}
              </p>
              <p className="text-xs text-muted-foreground">Supervisores</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.roles.includes('agent')).length}
              </p>
              <p className="text-xs text-muted-foreground">Agentes</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
          {filteredUsers.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-semibold">
                    {user.nome?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{user.nome || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{user.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user.roles.length > 0 ? (
                  user.roles.map(role => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)} className="hidden sm:inline-flex">
                      {getRoleLabel(role)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="hidden sm:inline-flex">Utilizador</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleResetClick(user)}
                  title="Redefinir senha"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Reset Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja redefinir a senha de <strong>{selectedUser?.nome || selectedUser?.telefone}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={isResetting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmReset} disabled={isResetting}>
              {isResetting ? 'A processar…' : 'Redefinir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={tempPasswordDialogOpen} onOpenChange={setTempPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporária gerada</DialogTitle>
            <DialogDescription>
              Copie a senha abaixo e envie ao utilizador <strong>{selectedUser?.nome || selectedUser?.telefone}</strong> via WhatsApp. O utilizador deverá alterá-la após o primeiro login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
            <code className="flex-1 text-lg font-mono text-foreground tracking-wider">{tempPassword}</code>
            <Button variant="ghost" size="icon-sm" onClick={handleCopyPassword}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPasswordDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
