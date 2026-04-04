

# Plan: Fix Supply List Workflow

## Problem

The current "Add Stock" page lets magaziniers insert stock **directly** into the database, bypassing the supply list approval workflow. This is both a logic error and a permissions issue (RLS only allows `stock_manager` to insert into the `stock` table directly).

The correct flow should be:
- **Engineer** → selects items from inventory → creates a **Demand List** → stock manager approves → stock is **subtracted**
- **Magazinier** → specifies items to add → creates a **Supply List** → stock manager approves → stock is **added**

Both flows require stock manager approval before any stock changes occur.

## Changes

### 1. Rewrite AddStockPage to create Supply Lists (not direct inserts)

The magazinier fills in item details (type, section, length, quantity) and submits a **supply list** for approval — just like engineers submit demand lists. The form stays the same but calls `useCreateSupplyList` instead of `useAddStock`.

For items that already exist in stock, the supply list references the existing `stock_id`. For **new items** (type+section+length combo not in stock), the page must first create a stock row with quantity=0 (or handle this in the approval trigger).

**Problem**: RLS only allows `stock_manager` to insert into `stock`. Two options:
- **Option A**: Allow magazinier to insert stock rows with quantity=0 (add RLS policy)
- **Option B**: Store item details (type, name, length) directly on `supply_list_items` so no stock row is needed until approval

Option B requires a schema change. Option A is simpler — add an RLS policy allowing magazinier to insert stock with quantity=0, and the approval trigger handles the rest.

**Recommended: Option A** — Add an RLS INSERT policy for magazinier on the `stock` table (restricted to quantity=0 inserts).

### 2. Database migration

```sql
-- Allow magazinier to insert stock items (quantity must be 0, placeholder for supply list references)
CREATE POLICY "Magazinier can insert zero-qty stock"
ON public.stock FOR INSERT TO authenticated
WITH CHECK (has_role('magazinier') AND quantity = 0);
```

### 3. Update AddStockPage

- Replace `useAddStock` call with a two-step flow:
  1. Find or create the stock item (with quantity=0 if new)
  2. Call `useCreateSupplyList` with the stock_id and supplied_quantity
- Add a confirmation dialog before submission
- Show the list will go to the stock manager for approval

### 4. Stock Manager direct add (optional)

Keep `useAddStock` available only for `stock_manager` role, who can bypass the supply list workflow if needed. On AddStockPage, if user is `stock_manager`, add stock directly. If `magazinier`, create a supply list.

### 5. Update supply approval trigger

The existing `handle_supply_approval` trigger already adds quantities on approval. Verify it also handles the case where the stock row was created with quantity=0 (it does — it runs `SET quantity = s.quantity + sli.supplied_quantity`).

## Files to modify

| File | Change |
|------|--------|
| `src/pages/AddChutePage.tsx` | Rewrite: magazinier creates supply list, stock_manager adds directly |
| `src/hooks/useStock.ts` | Keep `useAddStock` for stock_manager only; add `useFindOrCreateStock` for magazinier |
| Migration SQL | Add magazinier INSERT policy on stock table |

## Summary

This ensures all stock changes go through the approval workflow. Engineers request stock (demand), magaziniers add stock (supply), and the stock manager validates both.

