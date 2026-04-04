import { useStock } from '@/hooks/useStock';
import { useDemandLists } from '@/hooks/useDemandLists';
import { useSupplyLists } from '@/hooks/useSupplyLists';
import { useAuth } from '@/contexts/AuthContext';
import { Package, FileText, TrendingUp, Layers } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: stock = [] } = useStock();
  const { data: demandLists = [] } = useDemandLists();
  const { data: supplyLists = [] } = useSupplyLists();

  const totalItems = stock.reduce((sum, s) => sum + s.quantity, 0);
  const pendingDemands = demandLists.filter(d => d.status === 'pending').length;
  const pendingSupplies = supplyLists.filter(s => s.status === 'pending').length;
  const approvedDemands = demandLists.filter(d => d.status === 'approved').length;

  const cards = [
    { label: 'Total Pieces', value: totalItems, icon: Package, color: 'bg-secondary' },
    { label: 'Stock Types', value: stock.length, icon: Layers, color: 'bg-info' },
    { label: 'Pending Demands', value: pendingDemands, icon: FileText, color: 'bg-primary' },
    { label: 'Pending Supplies', value: pendingSupplies, icon: FileText, color: 'bg-warning' },
    { label: 'Approved Demands', value: approvedDemands, icon: TrendingUp, color: 'bg-success' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile?.display_name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(card => (
          <div key={card.label} className="stat-card flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className={`${card.color} text-secondary-foreground p-2 rounded-lg`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Stock by Type</h3>
          {stock.length > 0 ? (
            <div className="space-y-2">
              {Object.entries(
                stock.reduce<Record<string, number>>((acc, s) => {
                  acc[s.item_type] = (acc[s.item_type] || 0) + s.quantity;
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-20">{type}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div className="red-gradient h-full rounded-full flex items-center pl-3" style={{ width: `${Math.max((count / totalItems) * 100, 15)}%` }}>
                      <span className="text-xs font-bold text-primary-foreground">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No stock data</p>}
        </div>

        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            {pendingDemands} pending demand{pendingDemands !== 1 ? 's' : ''}, {pendingSupplies} pending suppl{pendingSupplies !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      </div>
    </div>
  );
}
