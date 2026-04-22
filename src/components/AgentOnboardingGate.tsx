import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentOnboarding } from '@/hooks/useAgentOnboarding';

interface Props {
  children: React.ReactNode;
}

/**
 * Forces newly-registered agents through the onboarding flow:
 *  onboarding -> profile -> register-atm -> pending -> dashboard
 * Admins/Supervisors that also have the agent role bypass the gate.
 */
export function AgentOnboardingGate({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAgent, isAdmin, isSupervisor, isLoading: authLoading } = useAuth();
  const { progress, loading } = useAgentOnboarding();

  const path = location.pathname;

  useEffect(() => {
    if (authLoading || loading) return;
    if (isAdmin || isSupervisor) return; // privileged users skip
    if (!isAgent || !progress) return;

    const onOnboarding = path === '/agent/onboarding';
    const onProfile = path === '/profile';
    const onRegister = path === '/agent/register-atm';
    const onPending = path === '/agent/pending';

    if (!progress.onboarding_seen) {
      if (!onOnboarding) navigate('/agent/onboarding', { replace: true });
      return;
    }
    if (!progress.profile_completed) {
      if (!onProfile) navigate('/profile?setup=1', { replace: true });
      return;
    }
    if (!progress.first_atm_submitted) {
      if (!onRegister) navigate('/agent/register-atm', { replace: true });
      return;
    }
    if (!progress.first_atm_approved) {
      if (!onPending) navigate('/agent/pending', { replace: true });
      return;
    }
  }, [authLoading, loading, isAgent, isAdmin, isSupervisor, progress, path, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}