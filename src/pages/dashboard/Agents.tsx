import { useEffect, useState } from 'react';
import { Search, Users, Shield, MoreVertical, UserPlus, Trash2 } from 'lucide-react';
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

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        *,
        profiles:user_id (nome, telefone)
      `)
      .eq('role', 'agent');
    
    setAgents(data || []);
    setIsLoading(false);
  };

  const filteredAgents = agents.filter(a =>
    a.profiles?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.profiles?.telefone?.includes(searchQuery)
  );

  return (
    <DashboardLayout title="Agentes" subtitle="Gerir agentes do sistema">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar agentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum agente encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
          {filteredAgents.map(agent => (
            <div key={agent.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {agent.profiles?.nome?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{agent.profiles?.nome || 'Agente'}</p>
                  <p className="text-sm text-muted-foreground">{agent.profiles?.telefone}</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                Agente
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
