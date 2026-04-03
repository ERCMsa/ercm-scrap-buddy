import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useAddStock } from '@/hooks/useStock';
import { STEEL_TYPES } from '@/types';

interface ExcelRow {
  [key: string]: any;
}

function normalizeRow(row: any): { steelType: string; sectionSize: string; length: number; quantity: number } | null {
  const steelType = row.steelType || row.SteelType || row.steel_type || row.Type || row.type || row['Steel Type'] || '';
  const sectionSize = String(row.sectionSize || row.SectionSize || row.section_size || row.Section || row.section || row['Section Size'] || '');
  const length = Number(row.length || row.Length || row['Length (mm)'] || 0);
  const quantity = Number(row.quantity || row.Quantity || row.qty || row.Qty || 1);

  if (!steelType || !sectionSize || !length) return null;

  const normalizedType = STEEL_TYPES.find(t => t.toLowerCase() === steelType.toString().toLowerCase());
  if (!normalizedType) return null;

  return { steelType: normalizedType, sectionSize, length, quantity: Math.max(1, quantity) };
}

export default function ExcelImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const addStock = useAddStock();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) { toast.error('The Excel file is empty'); return; }

      let added = 0;
      let skipped = 0;

      for (const row of rows) {
        const normalized = normalizeRow(row);
        if (!normalized) { skipped++; continue; }

        try {
          await addStock.mutateAsync({
            item_type: normalized.steelType,
            item_name: normalized.sectionSize,
            length: normalized.length,
            quantity: normalized.quantity,
          });
          added++;
        } catch {
          skipped++;
        }
      }

      toast.success(`Imported ${added} items${skipped > 0 ? `, ${skipped} rows skipped` : ''}`);
    } catch {
      toast.error('Failed to read Excel file');
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
        <FileSpreadsheet className="h-5 w-5" />
        Import from Excel
      </Button>
    </>
  );
}
