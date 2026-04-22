import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAgentOnboarding } from '@/hooks/useAgentOnboarding';

export default function AgentPending() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { progress, refresh } = useAgentOnboarding();

  useEffect(() => {
    if (progress?.first_atm_approved) {
      navigate('/agent', { replace: true });
    }
  }, [progress, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-primary/10 rounded-full p-6 inline-flex">
          <Clock className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O seu ATM foi submetido com sucesso. Um administrador vai validar os dados e criar a sua zona.
            Será notificado assim que estiver aprovado.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-left text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">O que acontece a seguir?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>O administrador revê foto, GPS e dados</li>
            <li>A sua zona é criada automaticamente</li>
            <li>Recebe uma notificação no telefone</li>
            <li>O Dashboard fica desbloqueado</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Verificar
          </Button>
          <Button variant="ghost" className="flex-1" onClick={async () => { await signOut(); window.location.href = '/'; }}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}