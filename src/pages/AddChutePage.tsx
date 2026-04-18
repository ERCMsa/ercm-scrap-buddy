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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PlusCircle, Plus, Trash2, Send } from 'lucide-react';
import type { SteelType } from '@/types';
import ExcelImport from '@/components/ExcelImport';

interface CartItem {
  steelType: SteelType;
  sectionSize: string;
  length: string;
  quantity: string;
}

export default function AddStockPage() {
  const { profile, hasRole } = useAuth();
  const addStock = useAddStock();
  const findOrCreate = useFindOrCreateStock();
  const createSupplyList = useCreateSupplyList();

  const [steelType, setSteelType] = useState<SteelType>('IPE');
  const [sectionSize, setSectionSize] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [length, setLength] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const isAdmin = profile?.role === 'admin';
  const isMagazinier = profile?.role === 'magazinier';
  const doDirectAdd = isAdmin;

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
    if (doDirectAdd) {
      handleDirectAdd();
    } else {
      // Magazinier: add to cart
      setCart([...cart, { steelType, sectionSize, length, quantity }]);
      toast.success('Item added to list');
      resetForm();
    }
  };

  const handleDirectAdd = async () => {
    setPending(true);
    try {
      await addStock.mutateAsync({
        item_type: steelType,
        item_name: sectionSize,
        length: parseInt(length),
        quantity: parseInt(quantity),
      });
      addNotification({
        type: 'supply_submitted',
        title: 'Stock Added',
        message: `${steelType} ${sectionSize} - ${length}mm (×${quantity}) added by ${profile?.display_name}`,
        forRoles: ['stock_manager', 'admin'],
      });
      toast.success(`Stock added: ${steelType} ${sectionSize} × ${quantity}`);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add stock');
    } finally {
      setPending(false);
    }
  };

  const handleSubmitSupplyList = async () => {
    setConfirmOpen(false);
    setPending(true);
    try {
      const items: { stock_id: string; supplied_quantity: number }[] = [];
      for (const item of cart) {
        const stockId = await findOrCreate.mutateAsync({
          item_type: item.steelType,
          item_name: item.sectionSize,
          length: parseInt(item.length),
        });
        items.push({ stock_id: stockId, supplied_quantity: parseInt(item.quantity) });
      }
      const notes = cart.map(i => `${i.steelType} ${i.sectionSize} - ${i.length}mm ×${i.quantity}`).join(', ');
      await createSupplyList.mutateAsync({ items, notes });
      addNotification({
        type: 'supply_submitted',
        title: 'Supply List Submitted',
        message: `${cart.length} item(s) submitted by ${profile?.display_name}`,
        forRoles: ['stock_manager', 'admin'],
      });
      toast.success('Supply list submitted for approval');
      setCart([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit supply list');
    } finally {
      setPending(false);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setLength('');
    setQuantity('1');
    setSectionSize('');
  };

  // Stock manager shouldn't be here
  if (profile?.role === 'stock_manager') {
    return (
      <div className="animate-fade-in p-8 text-center text-muted-foreground">
        Stock Managers can only validate or reject lists. Use the Lists page to manage requests.
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {doDirectAdd ? 'Add Stock' : 'Submit Supply List'}
        </h2>
        {doDirectAdd && <ExcelImport />}
      </div>

      {isMagazinier && (
        <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4 text-sm text-muted-foreground">
          Add items to your list below, then submit for Stock Manager approval.
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
        </div>

        <Button type="submit" className="btn-industrial red-gradient gap-2 w-full sm:w-auto" disabled={pending}>
          <PlusCircle className="h-5 w-5" />
          {pending ? 'Submitting...' : doDirectAdd ? 'Add Stock' : 'Add to List'}
        </Button>
      </form>

      {/* Magazinier cart */}
      {!doDirectAdd && cart.length > 0 && (
        <div className="mt-6 bg-card rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Items to Submit ({cart.length})</h3>
          <div className="space-y-2">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                <span className="text-sm text-foreground">
                  {item.steelType} {item.sectionSize} – {item.length}mm × {item.quantity}
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFromCart(i)} className="text-destructive hover:text-destructive h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={() => setConfirmOpen(true)} className="btn-industrial red-gradient gap-2" disabled={pending}>
            <Send className="h-5 w-5" />
            Submit Supply List ({cart.length} items)
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Supply Submission</DialogTitle>
            <DialogDescription>
              You are about to submit {cart.length} item(s) for Stock Manager approval:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm px-2">
            {cart.map((item, i) => (
              <li key={i} className="text-foreground">• {item.steelType} {item.sectionSize} – {item.length}mm × {item.quantity}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitSupplyList} className="red-gradient">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
