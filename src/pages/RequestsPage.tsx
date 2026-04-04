import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemandLists, useUpdateDemandStatus } from '@/hooks/useDemandLists';
import { useSupplyLists, useUpdateSupplyStatus } from '@/hooks/useSupplyLists';
import { useAllStock } from '@/hooks/useStock';
import { useProfiles } from '@/hooks/useProfile';
import { addNotification } from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

export default function RequestsPage() {
  const { hasRole } = useAuth();
  const { data: demandLists = [], isLoading: dl } = useDemandLists();
  const { data: supplyLists = [], isLoading: sl } = useSupplyLists();
  const { data: stock = [] } = useAllStock();
  const { data: profiles = [] } = useProfiles();
  const updateDemand = useUpdateDemandStatus();
  const updateSupply = useUpdateSupplyStatus();
  const [confirmAction, setConfirmAction] = useState<{ type: 'demand' | 'supply'; id: string; status: 'approved' | 'rejected' } | null>(null);

  const isManager = hasRole('stock_manager') || hasRole('admin');

  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.display_name || 'Unknown';
  const getStockName = (id: string) => {
    const s = stock.find(x => x.id === id);
    return s ? `${s.item_type} ${s.item_name}${s.length ? ` - ${s.length}mm` : ''}` : 'Unknown';
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'demand') {
        await updateDemand.mutateAsync({ id: confirmAction.id, status: confirmAction.status });
        addNotification({
          type: confirmAction.status === 'approved' ? 'demand_approved' : 'demand_rejected',
          title: `Demand List ${confirmAction.status}`,
          message: `A demand list has been ${confirmAction.status}`,
          forRoles: ['engineer', 'stock_manager'],
        });
      } else {
        await updateSupply.mutateAsync({ id: confirmAction.id, status: confirmAction.status });
        addNotification({
          type: confirmAction.status === 'approved' ? 'supply_approved' : 'supply_rejected',
          title: `Supply List ${confirmAction.status}`,
          message: `A supply list has been ${confirmAction.status}`,
          forRoles: ['magazinier', 'stock_manager'],
        });
      }
      toast.success(`List ${confirmAction.status}`);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
    setConfirmAction(null);
  };

  if (dl || sl) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Demand & Supply Lists</h2>

      <Tabs defaultValue="demand" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demand">Demand Lists ({demandLists.length})</TabsTrigger>
          <TabsTrigger value="supply">Supply Lists ({supplyLists.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="demand" className="space-y-3">
          {demandLists.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No demand lists yet</p>
          ) : (
            demandLists.map(dl => (
              <div key={dl.id} className="bg-card rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">By: {getProfileName(dl.created_by)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(dl.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[dl.status]}>{dl.status}</Badge>
                    {isManager && dl.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => setConfirmAction({ type: 'demand', id: dl.id, status: 'approved' })} className="bg-success text-success-foreground hover:bg-success/90 gap-1">
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: 'demand', id: dl.id, status: 'rejected' })} className="gap-1">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {dl.notes && <p className="text-sm text-muted-foreground">Note: {dl.notes}</p>}
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground text-xs"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th></tr></thead>
                  <tbody>
                    {dl.demand_list_items.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 text-foreground">{getStockName(item.stock_id)}</td>
                        <td className="py-2 text-right font-bold text-foreground">{item.requested_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dl.validated_by && (
                  <p className="text-xs text-muted-foreground">Validated by: {getProfileName(dl.validated_by)} on {dl.validated_at ? new Date(dl.validated_at).toLocaleDateString() : '—'}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="supply" className="space-y-3">
          {supplyLists.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No supply lists yet</p>
          ) : (
            supplyLists.map(sl => (
              <div key={sl.id} className="bg-card rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">By: {getProfileName(sl.created_by)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(sl.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[sl.status]}>{sl.status}</Badge>
                    {isManager && sl.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => setConfirmAction({ type: 'supply', id: sl.id, status: 'approved' })} className="bg-success text-success-foreground hover:bg-success/90 gap-1">
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: 'supply', id: sl.id, status: 'rejected' })} className="gap-1">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {sl.notes && <p className="text-sm text-muted-foreground">Note: {sl.notes}</p>}
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground text-xs"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th></tr></thead>
                  <tbody>
                    {sl.supply_list_items.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 text-foreground">{getStockName(item.stock_id)}</td>
                        <td className="py-2 text-right font-bold text-foreground">{item.supplied_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sl.validated_by && (
                  <p className="text-xs text-muted-foreground">Validated by: {getProfileName(sl.validated_by)} on {sl.validated_at ? new Date(sl.validated_at).toLocaleDateString() : '—'}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.status === 'approved' ? 'Approve' : 'Reject'} this list?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.status === 'approved'
                ? confirmAction?.type === 'demand'
                  ? 'Approving will subtract the requested quantities from stock.'
                  : 'Approving will add the supplied quantities to stock.'
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className={confirmAction?.status === 'approved' ? 'bg-success' : 'bg-destructive'}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
