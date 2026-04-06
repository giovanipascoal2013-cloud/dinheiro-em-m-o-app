import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformMarginData {
  platformMargin: number;
  agentShare: number;
  referralDiscount: number;
  isLoading: boolean;
}

const fetchMarginSettings = async () => {
  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['platform_margin', 'referral_discount']);

  const map: Record<string, string> = {};
  (data || []).forEach(row => { map[row.key] = row.value; });

  const platformMargin = Number(map['platform_margin']) || 0.30;
  const referralDiscount = Number(map['referral_discount']) || 0.30;
  return { platformMargin, referralDiscount };
};

export const usePlatformMargin = (): PlatformMarginData => {
  const { data, isLoading } = useQuery({
    queryKey: ['platform_settings', 'margin'],
    queryFn: fetchMarginSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const platformMargin = data?.platformMargin ?? 0.30;
  const referralDiscount = data?.referralDiscount ?? 0.30;

  return {
    platformMargin,
    agentShare: 1 - platformMargin,
    referralDiscount,
    isLoading,
  };
};
