import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useAddStock } from '@/hooks/useStock';
import { STEEL_TYPES } from '@/types';

function findValue(row: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (found !== undefined && row[found] !== undefined) return row[found];
  }
  return undefined;
}

function normalizeRow(row: any): { steelType: string; sectionSize: string; length: number; quantity: number } | null {
  const steelType = findValue(row, ['Steel Type', 'steelType', 'steel_type', 'Type', 'type']);
  const sectionSize = String(findValue(row, ['Section', 'Section Size', 'sectionSize', 'section_size', 'section']) ?? '');
  const length = Number(findValue(row, ['Length (mm)', 'Length', 'length']) ?? 0);
  const quantityRaw = findValue(row, ['Quantity', 'quantity', 'qty', 'Qty']);
  const quantity = quantityRaw === undefined ? 1 : Math.max(0, Number(quantityRaw) || 0);

  if (!steelType || !sectionSize || !length) return null;

  const normalizedType = STEEL_TYPES.find(t => t.toLowerCase() === steelType.toString().trim().toLowerCase());
  if (!normalizedType) return null;

  return { steelType: normalizedType, sectionSize: sectionSize.trim(), length, quantity: Math.max(1, quantity) };
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

      // Debug: show detected headers if needed
      const headers = Object.keys(rows[0]).map(k => k.trim()).join(', ');

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

      if (added === 0 && skipped > 0) {
        toast.error(`No rows imported. Detected headers: ${headers}. Expected: Steel Type, Section, Length (mm), Quantity`);
      } else {
        toast.success(`Imported ${added} items${skipped > 0 ? `, ${skipped} rows skipped` : ''}`);
      }
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
