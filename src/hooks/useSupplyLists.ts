import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupplyList, SupplyListItem } from '@/types';

export function useSupplyLists() {
  return useQuery({
    queryKey: ['supply_lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supply_lists')
        .select('*, supply_list_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (SupplyList & { supply_list_items: SupplyListItem[] })[];
    },
  });
}

export function useCreateSupplyList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, notes }: { items: { stock_id: string; supplied_quantity: number }[]; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: list, error } = await supabase
        .from('supply_lists')
        .insert({ created_by: user.id, notes: notes || '' })
        .select()
        .single();
      if (error) throw error;

      const listItems = items.map(i => ({
        supply_list_id: list.id,
        stock_id: i.stock_id,
        supplied_quantity: i.supplied_quantity,
      }));
      const { error: itemsError } = await supabase.from('supply_list_items').insert(listItems);
      if (itemsError) throw itemsError;

      return list;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supply_lists'] });
    },
  });
}

export function useUpdateSupplyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('supply_lists')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supply_lists'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['audit_log'] });
    },
  });
}
