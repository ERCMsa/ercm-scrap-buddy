import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockItem } from '@/types';

export function useStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: async (): Promise<StockItem[]> => {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('item_type')
        .order('item_name');
      if (error) throw error;
      return data as StockItem[];
    },
  });
}

export function useAllStock() {
  return useQuery({
    queryKey: ['stock', 'all'],
    queryFn: async (): Promise<StockItem[]> => {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('item_type')
        .order('item_name');
      if (error) throw error;
      return data as StockItem[];
    },
  });
}

// Direct add — stock_manager only
export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { item_type: string; item_name: string; length: number | null; quantity: number }) => {
      let query = supabase.from('stock').select('*').eq('item_type', item.item_type).eq('item_name', item.item_name);
      if (item.length !== null) {
        query = query.eq('length', item.length);
      } else {
        query = query.is('length', null);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('stock')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        const { data, error } = await supabase
          .from('stock')
          .insert({
            item_type: item.item_type,
            item_name: item.item_name,
            length: item.length,
            quantity: item.quantity,
          })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

// Find existing stock or create a zero-qty placeholder (magazinier)
export function useFindOrCreateStock() {
  return useMutation({
    mutationFn: async (item: { item_type: string; item_name: string; length: number | null }): Promise<string> => {
      let query = supabase.from('stock').select('id').eq('item_type', item.item_type).eq('item_name', item.item_name);
      if (item.length !== null) {
        query = query.eq('length', item.length);
      } else {
        query = query.is('length', null);
      }
      const { data: existing } = await query.maybeSingle();
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('stock')
        .insert({ item_type: item.item_type, item_name: item.item_name, length: item.length, quantity: 0 })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
  });
}
