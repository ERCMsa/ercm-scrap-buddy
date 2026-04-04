import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddStock, useFindOrCreateStock } from '@/hooks/useStock';
import { useCreateSupplyList } from '@/hooks/useSupplyLists';
import { addCustomSize, getCustomSizes } from '@/lib/store';
import { addNotification } from '@/lib/notifications';
import { STEEL_TYPES, SECTION_SIZES } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusCircle, Plus } from 'lucide-react';
import type { SteelType } from '@/types';
import ExcelImport from '@/components/ExcelImport';

export default function AddStockPage() {
  const { profile } = useAuth();
  const addStock = useAddStock();
  const findOrCreate = useFindOrCreateStock();
  const createSupplyList = useCreateSupplyList();

  const [steelType, setSteelType] = useState<SteelType>('IPE');
  const [sectionSize, setSectionSize] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [length, setLength] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minQuantity, setMinQuantity] = useState('0');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const isManager = profile?.role === 'stock_manager';
  const isMagazinier = profile?.role === 'magazinier';

  const customSizes = getCustomSizes();
  const allSizes = [
    ...SECTION_SIZES[steelType],
    ...(customSizes[steelType] || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handleAddCustomSize = () => {
    if (!customSize.trim()) return;
    addCustomSize(steelType, customSize.trim());
    setSectionSize(customSize.trim());
    setCustomSize('');
    setShowCustomSize(false);
    toast.success(`Size ${customSize.trim()} added to ${steelType}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionSize || !length || !quantity) { toast.error('Fill all fields'); return; }
    if (isMagazinier) {
      setConfirmOpen(true);
    } else {
      doDirectAdd();
    }
  };

  const doDirectAdd = async () => {
    setPending(true);
    try {
      await addStock.mutateAsync({
        item_type: steelType,
        item_name: sectionSize,
        length: parseInt(length),
        quantity: parseInt(quantity),
        min_quantity: parseInt(minQuantity) || 0,
      });
      addNotification({
        type: 'supply_submitted',
        title: 'Stock Added',
        message: `${steelType} ${sectionSize} - ${length}mm (×${quantity}) added by ${profile?.display_name}`,
        forRoles: ['stock_manager'],
      });
      toast.success(`Stock added: ${steelType} ${sectionSize} × ${quantity}`);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add stock');
    } finally {
      setPending(false);
    }
  };

  const doSupplyListSubmit = async () => {
    setConfirmOpen(false);
    setPending(true);
    try {
      const stockId = await findOrCreate.mutateAsync({
        item_type: steelType,
        item_name: sectionSize,
        length: parseInt(length),
      });
      await createSupplyList.mutateAsync({
        items: [{ stock_id: stockId, supplied_quantity: parseInt(quantity) }],
        notes: `${steelType} ${sectionSize} - ${length}mm`,
      });
      addNotification({
        type: 'supply_submitted',
        title: 'Supply List Submitted',
        message: `${steelType} ${sectionSize} - ${length}mm (×${quantity}) submitted by ${profile?.display_name}`,
        forRoles: ['stock_manager'],
      });
      toast.success('Supply list submitted for approval');
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit supply list');
    } finally {
      setPending(false);
    }
  };

  const resetForm = () => {
    setLength('');
    setQuantity('1');
    setSectionSize('');
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {isManager ? 'Add Stock' : 'Submit Supply List'}
        </h2>
        {isManager && <ExcelImport />}
      </div>

      {isMagazinier && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-muted-foreground">
          Items you submit will be sent to the Stock Manager for approval before being added to inventory.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label>Steel Type</Label>
            <Select value={steelType} onValueChange={v => { setSteelType(v as SteelType); setSectionSize(''); }}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STEEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Section Size</Label>
            {showCustomSize ? (
              <div className="flex gap-2">
                <Input value={customSize} onChange={e => setCustomSize(e.target.value)} placeholder="e.g. 350 or 110x110" className="h-12 flex-1" />
                <Button type="button" onClick={handleAddCustomSize} size="icon" className="h-12 w-12 shrink-0"><Plus className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" onClick={() => setShowCustomSize(false)} className="h-12">Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={sectionSize} onValueChange={setSectionSize}>
                  <SelectTrigger className="h-12 flex-1"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {allSizes.map(s => <SelectItem key={s} value={s}>{steelType} {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowCustomSize(true)} className="h-12 w-12 shrink-0" title="Add custom size">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>Length (mm)</Label>
            <Input type="number" min={1} max={12000} value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 850" className="h-12" />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} className="h-12" />
          </div>
          {isManager && (
            <div>
              <Label>Min Quantity (alert threshold)</Label>
              <Input type="number" min={0} value={minQuantity} onChange={e => setMinQuantity(e.target.value)} className="h-12" />
            </div>
          )}
        </div>

        <Button type="submit" className="btn-industrial red-gradient gap-2 w-full sm:w-auto" disabled={pending}>
          <PlusCircle className="h-5 w-5" />
          {pending ? 'Submitting...' : isManager ? 'Add Stock' : 'Submit for Approval'}
        </Button>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Supply Submission</DialogTitle>
            <DialogDescription>
              This will create a supply list for <strong>{steelType} {sectionSize}</strong> – {length}mm × {quantity}.
              It will be sent to the Stock Manager for approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={doSupplyListSubmit} className="red-gradient">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
