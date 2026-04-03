import { useAllStock } from '@/hooks/useStock';
import { useDemandLists } from '@/hooks/useDemandLists';
import { useSupplyLists } from '@/hooks/useSupplyLists';
import { BarChart3, TrendingUp, Recycle } from 'lucide-react';

export default function StatisticsPage() {
  const { data: stock = [] } = useAllStock();
  const { data: demandLists = [] } = useDemandLists();
  const { data: supplyLists = [] } = useSupplyLists();

  const totalPieces = stock.reduce((s, i) => s + i.quantity, 0);
  const approvedDemands = demandLists.filter(d => d.status === 'approved');
  const approvedSupplies = supplyLists.filter(s => s.status === 'approved');
  const totalDemanded = approvedDemands.reduce((s, d) => s + d.demand_list_items.reduce((ss, i) => ss + i.requested_quantity, 0), 0);
  const totalSupplied = approvedSupplies.reduce((s, sl) => s + sl.supply_list_items.reduce((ss, i) => ss + i.supplied_quantity, 0), 0);

  const typeCount: Record<string, number> = {};
  stock.forEach(s => { typeCount[s.item_type] = (typeCount[s.item_type] || 0) + s.quantity; });
  const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Statistics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <Recycle className="h-6 w-6 text-success mb-2" />
          <p className="text-3xl font-bold text-foreground">{totalPieces}</p>
          <p className="text-sm text-muted-foreground">Total Pieces in Stock</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="h-6 w-6 text-primary mb-2" />
          <p className="text-3xl font-bold text-foreground">{totalDemanded}</p>
          <p className="text-sm text-muted-foreground">Total Demanded</p>
        </div>
        <div className="stat-card">
          <BarChart3 className="h-6 w-6 text-info mb-2" />
          <p className="text-3xl font-bold text-foreground">{totalSupplied}</p>
          <p className="text-sm text-muted-foreground">Total Supplied</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-bold text-foreground mb-4">Stock by Type</h3>
        {topTypes.length > 0 ? (
          <div className="space-y-3">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-20">{type}</span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div className="red-gradient h-full rounded-full flex items-center pl-3" style={{ width: `${Math.max((count / totalPieces) * 100, 15)}%` }}>
                    <span className="text-xs font-bold text-primary-foreground">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm">No data yet</p>}
      </div>
    </div>
  );
}
