

# Fix: Excel Import Not Working with User's Headers

## Problem
The Excel import fails silently (all rows skipped) because the `normalizeRow` function doesn't handle the user's exact column headers robustly. Key issues:

1. **`Length (mm)` with trailing space** — Excel headers often have invisible trailing/leading spaces that cause exact-match lookup to fail
2. **Quantity defaulting to 1** — if quantity value is `0` (falsy), it incorrectly defaults to `1`
3. **No `Section` header support for sectionSize** — while `row.Section` works, trimmed/whitespace variants don't

## Solution
Rewrite `normalizeRow` to use a **case-insensitive, whitespace-trimmed key lookup** instead of hardcoded property access. This makes the import resilient to any header formatting variations.

## Changes

### `src/components/ExcelImport.tsx`
- Add a helper function that searches all keys in a row object using case-insensitive, trimmed matching against a list of possible header names
- Use this helper for all four fields: Steel Type, Section, Length, Quantity
- Fix quantity handling so explicit `0` is preserved (use `undefined` check instead of falsy check)
- Add a debug toast showing which headers were detected if all rows are skipped, to help troubleshoot

## Technical Detail
```typescript
// Helper: find value by trying multiple header names with trim + case-insensitive match
function findValue(row: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (found !== undefined && row[found] !== undefined) return row[found];
  }
  return undefined;
}
```

This single change makes the import work with any reasonable header naming convention.

