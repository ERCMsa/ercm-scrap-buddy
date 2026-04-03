import { useDemandLists } from '@/hooks/useDemandLists';
import { useSupplyLists } from '@/hooks/useSupplyLists';
import { useAllStock } from '@/hooks/useStock';
import { useProfiles } from '@/hooks/useProfile';
import { Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ArchivePage() {
  const { data: demandLists = [] } = useDemandLists();
  const { data: supplyLists = [] } = useSupplyLists();
  const { data: stock = [] } = useAllStock();
  const { data: profiles = [] } = useProfiles();

  const approvedDemands = demandLists.filter(d => d.status === 'approved');
  const approvedSupplies = supplyLists.filter(s => s.status === 'approved');

  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.display_name || 'Unknown';
  const getStockName = (id: string) => {
    const s = stock.find(x => x.id === id);
    return s ? `${s.item_type} ${s.item_name}${s.length ? ` - ${s.length}mm` : ''}` : 'Unknown';
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Archive — Approved Transactions</h2>
      </div>

      <h3 className="text-lg font-semibold text-foreground mt-4">Approved Demands ({approvedDemands.length})</h3>
      {approvedDemands.length === 0 ? (
        <p className="text-muted-foreground text-sm">No approved demands yet</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm table-industrial">
            <thead>
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Requester</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-left">Validated By</th>
                <th className="p-3 text-left">Validated At</th>
              </tr>
            </thead>
            <tbody>
              {approvedDemands.map(d => (
                <tr key={d.id} className="border-t hover:bg-accent/50">
                  <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-foreground">{getProfileName(d.created_by)}</td>
                  <td className="p-3 text-foreground">
                    {d.demand_list_items.map(i => `${getStockName(i.stock_id)} ×${i.requested_quantity}`).join(', ')}
                  </td>
                  <td className="p-3 text-foreground">{d.validated_by ? getProfileName(d.validated_by) : '—'}</td>
                  <td className="p-3 text-muted-foreground">{d.validated_at ? new Date(d.validated_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="text-lg font-semibold text-foreground mt-6">Approved Supplies ({approvedSupplies.length})</h3>
      {approvedSupplies.length === 0 ? (
        <p className="text-muted-foreground text-sm">No approved supplies yet</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm table-industrial">
            <thead>
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-left">Validated By</th>
                <th className="p-3 text-left">Validated At</th>
              </tr>
            </thead>
            <tbody>
              {approvedSupplies.map(s => (
                <tr key={s.id} className="border-t hover:bg-accent/50">
                  <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-foreground">{getProfileName(s.created_by)}</td>
                  <td className="p-3 text-foreground">
                    {s.supply_list_items.map(i => `${getStockName(i.stock_id)} ×${i.supplied_quantity}`).join(', ')}
                  </td>
                  <td className="p-3 text-foreground">{s.validated_by ? getProfileName(s.validated_by) : '—'}</td>
                  <td className="p-3 text-muted-foreground">{s.validated_at ? new Date(s.validated_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
