import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AgentOnboardingProgress {
  agent_id: string;
  onboarding_seen: boolean;
  profile_completed: boolean;
  first_atm_submitted: boolean;
  first_atm_approved: boolean;
  pending_atm_id: string | null;
}

export function useAgentOnboarding() {
  const { user, isAgent, isAdmin, isSupervisor, profile } = useAuth();
  const [progress, setProgress] = useState<AgentOnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !isAgent || isAdmin || isSupervisor) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let { data } = await supabase
      .from('agent_onboarding_progress' as any)
      .select('*')
      .eq('agent_id', user.id)
      .maybeSingle();

    if (!data) {
      // Backfill safety net for existing agents without progress row
      const { data: created } = await supabase
        .from('agent_onboarding_progress' as any)
        .insert({ agent_id: user.id })
        .select()
        .maybeSingle();
      data = created;
    }

    // Auto-detect profile completeness
    const p = profile as any;
    if (data && !(data as any).profile_completed && p?.nome && p?.provincia && p?.cidade) {
      const { data: updated } = await supabase
        .from('agent_onboarding_progress' as any)
        .update({ profile_completed: true })
        .eq('agent_id', user.id)
        .select()
        .maybeSingle();
      if (updated) data = updated;
    }

    setProgress(data as any);
    setLoading(false);
  }, [user, isAgent, isAdmin, isSupervisor, profile]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (patch: Partial<AgentOnboardingProgress>) => {
    if (!user) return;
    const { data } = await supabase
      .from('agent_onboarding_progress' as any)
      .update(patch)
      .eq('agent_id', user.id)
      .select()
      .maybeSingle();
    if (data) setProgress(data as any);
  };

  return { progress, loading, refresh: fetch, update };
}