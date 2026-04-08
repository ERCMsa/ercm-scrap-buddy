import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupplyLists, useUpdateSupplyStatus } from '@/hooks/useSupplyLists';
import { useAllStock, useAddStock, useFindOrCreateStock } from '@/hooks/useStock';
import { useProfiles } from '@/hooks/useProfile';
import { generateReceptionPDF } from '@/lib/pdf';
import { addNotification } from '@/lib/notifications';
import { STEEL_TYPES, SECTION_SIZES } from '@/types';
import type { SteelType } from '@/types';
import poidsData from '@/static/poids.json';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, Plus, FileText, ArrowLeft } from 'lucide-react';

const poidsMap: Record<string, number> = {};
poidsData.forEach((p: { designation: string; poids: number }) => {
  poidsMap[p.designation.trim()] = p.poids;
});

type ItemStatus = 'pending' | 'validated' | 'rejected';

interface ReviewItem {
  id: string;
  stock_id: string;
  name: string;
  quantity: number;
  length: number | null;
  poids: number | null;
  status: ItemStatus;
  rejectReason: string;
  addedByManager: boolean;
}

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: 'bg-warning text-warning-foreground',
  validated: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

export default function ReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const { data: supplyLists = [], isLoading } = useSupplyLists();
  const { data: stock = [] } = useAllStock();
  const { data: profiles = [] } = useProfiles();
  const updateSupply = useUpdateSupplyStatus();
  const addStock = useAddStock();
  const findOrCreate = useFindOrCreateStock();

  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null);
  const [rejectDialogItem, setRejectDialogItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Add item form
  const [newSteelType, setNewSteelType] = useState<SteelType>('IPE');
  const [newSection, setNewSection] = useState('');
  const [newLength, setNewLength] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');

  const supplyList = supplyLists.find(sl => sl.id === id);
  const isManager = hasRole('stock_manager') || hasRole('admin');

  const getStockItem = (stockId: string) => stock.find(x => x.id === stockId);
  const getProfileName = (uid: string) => profiles.find(p => p.id === uid)?.display_name || 'Unknown';

  const calcPoids = (type: string, name: string, length: number | null) => {
    const designation = `${type} ${name}`.trim();
    const ps = poidsMap[designation];
    if (ps == null || length == null) return null;
    return Math.round(ps * (length / 1000) * 100) / 100;
  };

  // Initialize review items from supply list
  useMemo(() => {
    if (supplyList && stock.length > 0 && reviewItems === null) {
      const items: ReviewItem[] = supplyList.supply_list_items.map(item => {
        const s = getStockItem(item.stock_id);
        const name = s ? `${s.item_type} ${s.item_name}${s.length ? ` - ${s.length}mm` : ''}` : 'Unknown';
        return {
          id: item.id,
          stock_id: item.stock_id,
          name,
          quantity: item.supplied_quantity,
          length: s?.length ?? null,
          poids: s ? calcPoids(s.item_type, s.item_name, s.length) : null,
          status: 'pending' as ItemStatus,
          rejectReason: '',
          addedByManager: false,
        };
      });
      setReviewItems(items);
    }
  }, [supplyList, stock]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!supplyList) return <div className="p-8 text-center text-muted-foreground">Supply list not found</div>;
  if (supplyList.status !== 'pending') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This supply list has already been {supplyList.status}.
        <Button variant="outline" className="ml-4" onClick={() => navigate('/requests')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lists
        </Button>
      </div>
    );
  }
  if (!isManager) {
    return <div className="p-8 text-center text-muted-foreground">Only Stock Managers and Admins can validate receptions.</div>;
  }

  const items = reviewItems || [];
  const allReviewed = items.length > 0 && items.every(i => i.status !== 'pending');
  const validatedItems = items.filter(i => i.status === 'validated');
  const rejectedItems = items.filter(i => i.status === 'rejected');
  const addedItems = items.filter(i => i.addedByManager);
  const totalValidatedQty = validatedItems.reduce((s, i) => s + i.quantity, 0);

  const handleValidate = (itemId: string) => {
    setReviewItems(prev => prev?.map(i => i.id === itemId ? { ...i, status: 'validated' as ItemStatus, rejectReason: '' } : i) || []);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setReviewItems(prev => prev?.map(i => i.id === rejectDialogItem ? { ...i, status: 'rejected' as ItemStatus, rejectReason: rejectReason.trim() } : i) || []);
    setRejectDialogItem(null);
    setRejectReason('');
  };

  const handleResetItem = (itemId: string) => {
    setReviewItems(prev => prev?.map(i => i.id === itemId ? { ...i, status: 'pending' as ItemStatus, rejectReason: '' } : i) || []);
  };

  const handleAddItem = async () => {
    if (!newSection || !newLength || !newQuantity) { toast.error('Fill all fields'); return; }
    try {
      const stockId = await findOrCreate.mutateAsync({
        item_type: newSteelType,
        item_name: newSection,
        length: parseInt(newLength),
      });
      const name = `${newSteelType} ${newSection} - ${newLength}mm`;
      const poids = calcPoids(newSteelType, newSection, parseInt(newLength));
      const newItem: ReviewItem = {
        id: `added-${Date.now()}`,
        stock_id: stockId,
        name,
        quantity: parseInt(newQuantity),
        length: parseInt(newLength),
        poids,
        status: 'validated',
        rejectReason: '',
        addedByManager: true,
      };
      setReviewItems(prev => [...(prev || []), newItem]);
      setAddItemOpen(false);
      setNewSection('');
      setNewLength('');
      setNewQuantity('1');
      toast.success('Item added and validated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item');
    }
  };

  const handleSubmit = async () => {
    setConfirmSubmitOpen(false);
    setPending(true);
    try {
      // Only manually add stock for items added by the manager (not in supply_list_items).
      // Original items are handled by the handle_supply_approval() database trigger
      // when the supply list status changes to 'approved'.
      for (const item of addedItems) {
        const s = getStockItem(item.stock_id);
        if (s) {
          await addStock.mutateAsync({
            item_type: s.item_type,
            item_name: s.item_name,
            length: s.length ? Number(s.length) : null,
            quantity: item.quantity,
          });
        }
      }

      // If all original items are rejected, reject the list; otherwise approve
      const originalItems = items.filter(i => !i.addedByManager);
      const allOriginalRejected = originalItems.length > 0 && originalItems.every(i => i.status === 'rejected');
      
      if (allOriginalRejected && addedItems.length === 0) {
        await updateSupply.mutateAsync({ id: supplyList.id, status: 'rejected' });
      } else {
        await updateSupply.mutateAsync({ id: supplyList.id, status: 'approved' });
      }

      // Generate rapport
      generateReceptionPDF({
        date: new Date().toLocaleDateString('fr-FR'),
        stockManagerName: profile?.display_name || 'Unknown',
        magazinierName: getProfileName(supplyList.created_by),
        validatedItems: validatedItems.map(i => ({ name: i.name, quantity: i.quantity, poids: i.poids })),
        rejectedItems: rejectedItems.map(i => ({ name: i.name, quantity: i.quantity, reason: i.rejectReason })),
        addedItems: addedItems.map(i => ({ name: i.name, quantity: i.quantity, poids: i.poids })),
        totalValidatedQty,
      });

      addNotification({
        type: 'supply_approved',
        title: 'Rapport de Réception',
        message: `Reception validated: ${validatedItems.length} accepted, ${rejectedItems.length} rejected`,
        forRoles: ['magazinier', 'stock_manager', 'admin'],
      });

      toast.success('Rapport de réception generated');
      navigate('/requests');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate('/requests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Validation Réception</h2>
          <p className="text-sm text-muted-foreground">
            Supply list by {getProfileName(supplyList.created_by)} — {new Date(supplyList.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{items.length} items total</Badge>
        <Badge className="bg-success text-success-foreground">{validatedItems.length} validated</Badge>
        <Badge className="bg-destructive text-destructive-foreground">{rejectedItems.length} rejected</Badge>
        <Badge className="bg-warning text-warning-foreground">{items.filter(i => i.status === 'pending').length} pending</Badge>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm table-industrial">
          <thead>
            <tr>
              <th className="p-3 text-left">Article</th>
              <th className="p-3 text-right">Quantity</th>
              <th className="p-3 text-right">Length (mm)</th>
              <th className="p-3 text-right">Poids (kg)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t hover:bg-accent/50 transition-colors">
                <td className="p-3 font-semibold text-foreground">
                  {item.name}
                  {item.addedByManager && (
                    <Badge variant="outline" className="ml-2 text-xs">Added by SM</Badge>
                  )}
                </td>
                <td className="p-3 text-right font-mono text-foreground">{item.quantity}</td>
                <td className="p-3 text-right font-mono text-foreground">{item.length ?? '—'}</td>
                <td className="p-3 text-right font-mono text-foreground">{item.poids ?? '—'}</td>
                <td className="p-3 text-center">
                  <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                  {item.status === 'rejected' && item.rejectReason && (
                    <p className="text-xs text-destructive mt-1">{item.rejectReason}</p>
                  )}
                </td>
                <td className="p-3 text-center">
                  {item.status === 'pending' ? (
                    <div className="flex justify-center gap-1">
                      <Button size="sm" onClick={() => handleValidate(item.id)} className="bg-success text-success-foreground hover:bg-success/90 gap-1 h-8">
                        <Check className="h-3 w-3" /> Validate
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setRejectDialogItem(item.id); setRejectReason(''); }} className="gap-1 h-8">
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleResetItem(item.id)} className="h-8 text-xs">
                      Reset
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setAddItemOpen(true)} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
        <Button
          onClick={() => setConfirmSubmitOpen(true)}
          className="btn-industrial red-gradient gap-2"
          disabled={!allReviewed || pending}
        >
          <FileText className="h-4 w-4" />
          {pending ? 'Submitting...' : 'Submit Rapport de Réception'}
        </Button>
      </div>

      {!allReviewed && items.length > 0 && (
        <p className="text-sm text-warning">All items must be validated or rejected before submission.</p>
      )}

      {/* Reject reason dialog */}
      <Dialog open={!!rejectDialogItem} onOpenChange={() => setRejectDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>Provide a reason for rejection:</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Quantity incorrect, length mismatch, wrong reference..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Add a new item or additional quantity to the reception.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Steel Type</Label>
              <Select value={newSteelType} onValueChange={v => { setNewSteelType(v as SteelType); setNewSection(''); }}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section Size</Label>
              <Select value={newSection} onValueChange={setNewSection}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {SECTION_SIZES[newSteelType].map(s => <SelectItem key={s} value={s}>{newSteelType} {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Length (mm)</Label>
              <Input type="number" min={1} value={newLength} onChange={e => setNewLength(e.target.value)} placeholder="e.g. 850" className="h-11" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} className="red-gradient">Add & Validate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm submit dialog */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Rapport de Réception</DialogTitle>
            <DialogDescription>Review the summary before submission:</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-success">{validatedItems.length} Validated Items:</p>
              <ul className="ml-4 list-disc text-foreground">
                {validatedItems.map(i => <li key={i.id}>{i.name} × {i.quantity}</li>)}
              </ul>
            </div>
            {rejectedItems.length > 0 && (
              <div>
                <p className="font-semibold text-destructive">{rejectedItems.length} Rejected Items:</p>
                <ul className="ml-4 list-disc text-foreground">
                  {rejectedItems.map(i => <li key={i.id}>{i.name} × {i.quantity} — <span className="text-destructive">{i.rejectReason}</span></li>)}
                </ul>
              </div>
            )}
            {addedItems.length > 0 && (
              <div>
                <p className="font-semibold text-primary">{addedItems.length} Added by Stock Manager:</p>
                <ul className="ml-4 list-disc text-foreground">
                  {addedItems.map(i => <li key={i.id}>{i.name} × {i.quantity}</li>)}
                </ul>
              </div>
            )}
            <p className="font-bold text-foreground">Total validated quantity: {totalValidatedQty}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="red-gradient">Confirm & Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
