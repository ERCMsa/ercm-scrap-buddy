export type AppRole = 'engineer' | 'magazinier' | 'stock_manager';

export const ROLE_LABELS: Record<AppRole, string> = {
  stock_manager: 'Stock Manager',
  engineer: 'Engineer',
  magazinier: 'Magazinier',
};

export type SteelType = 'HEA' | 'IPE' | 'UPN' | 'Cornier';
export const STEEL_TYPES: SteelType[] = ['HEA', 'IPE', 'UPN', 'Cornier'];

export const SECTION_SIZES: Record<SteelType, string[]> = {
  HEA: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600', '650', '700', '800', '900', '1000'],
  IPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500', '550', '600'],
  UPN: ['50', '65', '80', '100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '350', '380', '400'],
  Cornier: ['25x25', '30x30', '35x35', '40x40', '45x45', '50x50', '55x55', '60x60', '65x65', '70x70', '75x75', '80x80', '90x90', '100x100', '120x120', '150x150', '200x200'],
};

export interface StockItem {
  id: string;
  item_type: string;
  item_name: string;
  length: number | null;
  width: number | null;
  thickness: number | null;
  quantity: number;
  min_quantity: number;
  created_at: string;
  updated_at: string;
}

export type ListStatus = 'pending' | 'approved' | 'rejected';

export interface DemandList {
  id: string;
  created_by: string;
  status: ListStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  validated_by: string | null;
  validated_at: string | null;
}

export interface DemandListItem {
  id: string;
  demand_list_id: string;
  stock_id: string;
  requested_quantity: number;
  created_at: string;
}

export interface SupplyList {
  id: string;
  created_by: string;
  status: ListStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  validated_by: string | null;
  validated_at: string | null;
}

export interface SupplyListItem {
  id: string;
  supply_list_id: string;
  stock_id: string;
  supplied_quantity: number;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}
