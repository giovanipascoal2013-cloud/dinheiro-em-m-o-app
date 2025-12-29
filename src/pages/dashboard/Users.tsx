import { useEffect, useState } from 'react';
import { Search, Users, Shield, UserCog } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to users
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
      case 'admin':
        return 'destructive';
      case 'supervisor':
        return 'default';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'supervisor':
        return 'Supervisor';
      case 'agent':
        return 'Agente';
      default:
        return 'Utilizador';
    }
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
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {user.nome?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.nome || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{user.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map(role => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)}>
                      {getRoleLabel(role)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Utilizador</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
