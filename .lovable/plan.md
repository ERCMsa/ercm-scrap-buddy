

# Plan: Four Changes to Role Logic and Inventory Behavior

## Summary of Changes

1. **Remove `min_quantity`** — if quantity is 0, show "Not Available" and disable selection in demand flow
2. **Magazinier can add multiple items to a supply list** — add a "cart" pattern to AddStockPage
3. **Add `admin` role** — can do everything (add/remove stock directly, approve/reject, manage users)
4. **Stock Manager cannot add stock** — can only validate/reject demand and supply lists

## Technical Details

### 1. Remove min_quantity, handle zero-stock display

**InventoryPage.tsx**:
- Remove the "Min Qty" column from the table
- When `quantity === 0`: show "Not Available" badge, disable the request quantity input
- Remove `min_quantity` references and low-stock alert logic
- The `useStock` hook already filters `quantity > 0` — change to show ALL stock (including 0) so engineers can see what exists but mark 0-qty as unavailable

**AddChutePage.tsx**: Remove the min_quantity input field entirely.

**DashboardPage.tsx**: Remove low-stock alert references tied to min_quantity.

### 2. Magazinier multi-item supply list

**AddChutePage.tsx**: Add a "cart" list where the magazinier can add multiple items before submitting one supply list:
- After filling type/section/length/qty, click "Add to List" (instead of submitting immediately)
- Items accumulate in a local array displayed below the form
- A "Submit Supply List" button sends all items at once via `useCreateSupplyList`
- Each item in the cart can be removed before submission
- Confirmation dialog shows all items before final submission

### 3. Add `admin` role

**Database migration**:
- Add `'admin'` to the `app_role` enum
- Add RLS policies for admin on all tables (admin can do everything)
- Update `has_role` function — or add separate admin policies that grant full access

**types/index.ts**: Add `'admin'` to `AppRole`, add label to `ROLE_LABELS`.

**AuthContext.tsx**: Update `hasRole` — admin implicitly has all roles.

**All pages**: Where we check `isManager`, also check `isAdmin`. Simplest approach: make `hasRole` return `true` for any role if the user is admin.

**AppLayout.tsx**: Admin sees all nav items.

**AddChutePage.tsx**: Admin can add stock directly (like current stock_manager behavior).

**InventoryPage.tsx**: Admin can request items and also directly manage stock.

**RequestsPage.tsx**: Admin can approve/reject all lists.

**SettingsPage.tsx**: Admin can manage users and see audit log. Admin can also delete stock items.

### 4. Stock Manager cannot add stock directly

**AppLayout.tsx**: Remove `stock_manager` from the `Add Stock` nav item roles. Only `admin` and `magazinier` see it.

**AddChutePage.tsx**: Remove the `isManager` direct-add path. Stock managers who somehow reach the page get redirected or see a message. Only `admin` gets `doDirectAdd`, magazinier gets supply list flow.

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `'admin'` to AppRole, ROLE_LABELS |
| `src/contexts/AuthContext.tsx` | `hasRole` returns true for everything if admin |
| `src/pages/InventoryPage.tsx` | Remove min_qty column, disable 0-qty items, show all stock |
| `src/pages/AddChutePage.tsx` | Multi-item cart for magazinier, remove min_qty field, admin direct add, remove stock_manager direct add |
| `src/components/AppLayout.tsx` | Update nav roles (admin everywhere, remove stock_manager from Add Stock) |
| `src/pages/DashboardPage.tsx` | Remove min_quantity alerts |
| `src/pages/SettingsPage.tsx` | Admin can manage users |
| `src/pages/RequestsPage.tsx` | Admin can approve/reject |
| `src/hooks/useStock.ts` | `useStock` returns all items (including qty=0) |
| Migration SQL | Add admin to app_role enum, add admin RLS policies |

## Database Migration

```sql
-- Add admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Admin full access policies for all tables
CREATE POLICY "Admin full access stock" ON public.stock FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access demand_lists" ON public.demand_lists FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access demand_list_items" ON public.demand_list_items FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access supply_lists" ON public.supply_lists FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access supply_list_items" ON public.supply_list_items FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access audit_log" ON public.audit_log FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL TO authenticated
USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));
```

