import { useState, useMemo } from 'react';
import { useStock } from '@/hooks/useStock';
import { useCreateDemandList } from '@/hooks/useDemandLists';
import { useAuth } from '@/contexts/AuthContext';
import { STEEL_TYPES, StockItem } from '@/types';
import { addNotification } from '@/lib/notifications';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InventoryPage() {
  const { profile, hasRole } = useAuth();
  const { data: stock = [], isLoading } = useStock();
  const createDemand = useCreateDemandList();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [demandItems, setDemandItems] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return stock.filter(s => {
      if (filterType !== 'all' && s.item_type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.item_type.toLowerCase().includes(q) ||
          s.item_name.toLowerCase().includes(q) ||
          (s.length?.toString() || '').includes(q);
      }
      return true;
    });
  }, [stock, search, filterType]);

  const updateDemandQty = (stockId: string, qty: number, maxQty: number) => {
    const newErrors = { ...errors };
    if (qty > maxQty) {
      newErrors[stockId] = `Max available: ${maxQty}`;
    } else {
      delete newErrors[stockId];
    }
    setErrors(newErrors);

    if (qty <= 0) {
      const next = { ...demandItems };
      delete next[stockId];
      setDemandItems(next);
    } else {
      setDemandItems({ ...demandItems, [stockId]: qty });
    }
  };

  const selectedItems = Object.entries(demandItems).filter(([_, qty]) => qty > 0);
  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmitDemand = async () => {
    if (hasErrors) { toast.error('Fix quantity errors before submitting'); return; }
    try {
      await createDemand.mutateAsync({
        items: selectedItems.map(([stock_id, requested_quantity]) => ({ stock_id, requested_quantity })),
      });
      addNotification({
        type: 'demand_submitted',
        title: 'New Demand List',
        message: `${profile?.display_name} submitted a demand list (${selectedItems.length} items)`,
        forRoles: ['stock_manager'],
      });
      toast.success('Demand list submitted');
      setDemandItems({});
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    }
  };

  const isEngineer = hasRole('engineer');

  if (isLoading) return <div className="animate-fade-in p-8 text-center text-muted-foreground">Loading inventory...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Stock Inventory</h2>
        {isEngineer && selectedItems.length > 0 && (
          <Button onClick={() => setConfirmOpen(true)} size="lg" className="btn-industrial red-gradient gap-2 text-base" disabled={hasErrors}>
            <Send className="h-5 w-5" />
            Submit Demand ({selectedItems.length} items)
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search type, section, length..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-11"><SelectValue placeholder="Steel Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {STEEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} stock items</p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm table-industrial">
          <thead>
            <tr>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Section</th>
              <th className="p-3 text-right">Length (mm)</th>
              <th className="p-3 text-center">Quantity</th>
              <th className="p-3 text-center">Min Qty</th>
              {isEngineer && <th className="p-3 text-center">Request Qty</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const isLow = s.quantity <= s.min_quantity && s.min_quantity > 0;
              return (
                <tr key={s.id} className={`border-t hover:bg-accent/50 transition-colors ${isLow ? 'bg-warning/10' : ''}`}>
                  <td className="p-3 font-semibold text-foreground">{s.item_type}</td>
                  <td className="p-3 text-foreground">{s.item_type} {s.item_name}</td>
                  <td className="p-3 text-right font-mono text-foreground">{s.length ?? '—'}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-bold text-foreground">{s.quantity}</span>
                      {isLow && <AlertTriangle className="h-4 w-4 text-warning" />}
                    </div>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{s.min_quantity}</td>
                  {isEngineer && (
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={s.quantity}
                          value={demandItems[s.id] || ''}
                          onChange={e => updateDemandQty(s.id, parseInt(e.target.value) || 0, s.quantity)}
                          className="w-20 h-9 text-center"
                          placeholder="0"
                        />
                        {errors[s.id] && (
                          <span className="text-destructive text-xs font-medium">{errors[s.id]}</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={isEngineer ? 6 : 5} className="p-8 text-center text-muted-foreground">No stock items found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Demand List?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to request {selectedItems.length} items. This will be sent to the Stock Manager for approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitDemand} className="red-gradient">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
