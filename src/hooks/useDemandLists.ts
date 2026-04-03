import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DemandList, DemandListItem } from '@/types';

export function useDemandLists() {
  return useQuery({
    queryKey: ['demand_lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_lists')
        .select('*, demand_list_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (DemandList & { demand_list_items: DemandListItem[] })[];
    },
  });
}

export function useCreateDemandList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, notes }: { items: { stock_id: string; requested_quantity: number }[]; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: list, error } = await supabase
        .from('demand_lists')
        .insert({ created_by: user.id, notes: notes || '' })
        .select()
        .single();
      if (error) throw error;

      const listItems = items.map(i => ({
        demand_list_id: list.id,
        stock_id: i.stock_id,
        requested_quantity: i.requested_quantity,
      }));
      const { error: itemsError } = await supabase.from('demand_list_items').insert(listItems);
      if (itemsError) throw itemsError;

      return list;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demand_lists'] });
    },
  });
}

export function useUpdateDemandStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('demand_lists')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demand_lists'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['audit_log'] });
    },
  });
}
