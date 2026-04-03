import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fetchPricePerAtm = async (): Promise<number> => {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'price_per_atm')
    .single();
  return data ? Number(data.value) || 500 : 500;
};

export const usePricePerAtm = () => {
  const { data: pricePerAtm = 500 } = useQuery({
    queryKey: ['platform_settings', 'price_per_atm'],
    queryFn: fetchPricePerAtm,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
  return pricePerAtm;
};
