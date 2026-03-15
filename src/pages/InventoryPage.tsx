import { useState, useMemo } from 'react';
import { getChutes, getNextTransferNumber, getRequests, saveRequests, saveChutes } from '@/lib/store';
import { addNotification } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { Chute, STEEL_TYPES, TransferRequest } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-success text-success-foreground',
  Reserved: 'bg-warning text-warning-foreground',
};

export default function InventoryPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [chutes, setChutes] = useState(getChutes);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return chutes.filter(c => {
      if (c.status === 'Used') return false;
      if (filterType !== 'all' && c.steelType !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return c.id.toLowerCase().includes(s) ||
          c.steelType.toLowerCase().includes(s) ||
          c.sectionSize.toLowerCase().includes(s) ||
          c.locationCode.toLowerCase().includes(s) ||
          c.length.toString().includes(s);
      }
      return true;
    });
  }, [chutes, search, filterType, filterStatus]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const availableIds = filtered.filter(c => c.status === 'Available').map(c => c.id);
    if (availableIds.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableIds));
    }
  };

  const handleCreateRequest = () => {
    if (!user) return;
    const selectedChutes = chutes.filter(c => selected.has(c.id) && c.status === 'Available');
    if (selectedChutes.length === 0) {
      toast.error('Select at least one available chute');
      return;
    }

    // Mark selected chutes as Reserved
    const updatedChutes = chutes.map(c =>
      selected.has(c.id) && c.status === 'Available'
        ? { ...c, status: 'Reserved' as const }
        : c
    );
    saveChutes(updatedChutes);
    setChutes(updatedChutes);

    const req: TransferRequest = {
      id: crypto.randomUUID(),
      transferNumber: getNextTransferNumber(),
      requesterId: user.id,
      requesterName: user.fullName,
      unit: user.unit || 'unit1',
      chuteIds: selectedChutes.map(c => c.id),
      status: 'Pending',
      dateCreated: new Date().toISOString().split('T')[0],
    };
    const requests = getRequests();
    requests.push(req);
    saveRequests(requests);

    addNotification({
      type: 'request_created',
      title: 'New Transfer Request',
      message: `${req.transferNumber} by ${user.fullName} (${selectedChutes.length} pieces)`,
      forRoles: ['store_manager', 'production_manager', 'unit1_manager', 'unit2_manager'],
    });

    toast.success(`Transfer request ${req.transferNumber} created (${selectedChutes.length} pieces)`);
    setSelected(new Set());
    navigate('/requests');
  };

  const selectedAvailable = [...selected].filter(id => chutes.find(c => c.id === id)?.status === 'Available');

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Chute Inventory</h2>
        {selected.size > 0 && (
          <Button onClick={handleCreateRequest} size="lg" className="btn-industrial red-gradient gap-2 text-base">
            <Send className="h-5 w-5" />
            Request Selected ({selectedAvailable.length} pieces)
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ID, type, section..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-11"><SelectValue placeholder="Steel Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {STEEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} pieces in stock</p>
        <p className="text-sm text-muted-foreground">
          ✅ Select chutes then click <strong>"Request Selected"</strong> to create a transfer request
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm table-industrial">
          <thead>
            <tr>
              <th className="p-3 w-10">
                <Checkbox
                  checked={filtered.filter(c => c.status === 'Available').length > 0 && filtered.filter(c => c.status === 'Available').every(c => selected.has(c.id))}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Section</th>
              <th className="p-3 text-right">Length (mm)</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr
                key={c.id}
                className={`border-t hover:bg-accent/50 transition-colors cursor-pointer ${selected.has(c.id) ? 'bg-primary/10' : ''}`}
                onClick={() => c.status === 'Available' && toggleSelect(c.id)}
              >
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  {c.status === 'Available' ? (
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-3 font-mono font-medium text-foreground">{c.id}</td>
                <td className="p-3 font-semibold text-foreground">{c.steelType}</td>
                <td className="p-3 text-foreground">{c.steelType} {c.sectionSize}</td>
                <td className="p-3 text-right font-mono text-foreground">{c.length}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <MapPin className="h-3 w-3 text-primary" />
                    {c.locationCode}
                  </span>
                </td>
                <td className="p-3">
                  <Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{c.dateAdded}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No chutes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
