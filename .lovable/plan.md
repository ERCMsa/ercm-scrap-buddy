

# Plan: Refactor to Quantity-Based Stock System with Demand/Supply Lists

## Current State

The app tracks individual chute records in localStorage (each piece = 1 row). The Supabase backend already has the correct schema: `stock` (quantity-based), `demand_lists`, `supply_lists`, `demand_list_items`, `supply_list_items`, `audit_log`, and `profiles` tables. **The frontend does not use any of these tables yet.**

## What Changes

### 1. Switch data model from individual chutes to quantity-based stock

- **Remove**: `rack`, `level`, `locationCode`, `status` fields from the inventory model
- **Add**: `quantity` and `min_quantity` fields
- Each row = a unique combination of (steelType, sectionSize, length) with a quantity count
- Inventory only shows items with quantity > 0
- Update `types/index.ts` to define a `StockItem` interface matching the Supabase `stock` table

### 2. Connect frontend to Supabase backend

- Replace all `localStorage` calls (`getChutes`, `saveChutes`, etc.) with Supabase queries
- Create React hooks: `useStock`, `useDemandLists`, `useSupplyLists`, `useAuditLog`
- Use `@tanstack/react-query` for data fetching and cache management

### 3. Demand List (replaces "Transfer Requests")

- Engineers select stock items from inventory and specify quantities
- **Validation**: requested quantity cannot exceed available stock — show inline error
- Submitting creates a `demand_list` + `demand_list_items` in Supabase
- On **approval** by Stock Manager: quantities are subtracted from stock via a database trigger/function
- On **rejection**: no stock change
- Add confirmation dialog before approval

### 4. Supply List (new feature)

- Magaziniers (store workers) create supply lists to add new stock
- Each item includes: steel type, section size, length, quantity
- **Auto-merge**: if an item with same type + size + length exists, add to its quantity instead of creating a new row
- On **approval**: quantities are added to stock
- Add confirmation dialog before approval

### 5. Audit Log

- Every approval/rejection writes to `audit_log` table with: action type, user_id, timestamp, details (items, quantities, list reference)
- Add an "Audit Log" tab in Settings (visible to stock_manager only) showing transaction history
- Track: creator, validator, creation date, validation date

### 6. Notifications

- Add notification types: `demand_submitted`, `supply_submitted`
- Trigger on new demand/supply list creation
- Target stock_manager role for all notifications

### 7. Stock Protection

- Database-level: add a trigger on stock table to prevent quantity going below 0
- Frontend-level: validate before submission and show error
- Low stock alert: highlight rows where `quantity <= min_quantity` with a warning badge
- Dashboard shows low-stock items count

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/types/index.ts` | Rewrite: StockItem, DemandList, SupplyList, AuditEntry types |
| `src/hooks/useStock.ts` | Create: Supabase queries for stock CRUD |
| `src/hooks/useDemandLists.ts` | Create: fetch/create/approve/reject demand lists |
| `src/hooks/useSupplyLists.ts` | Create: fetch/create/approve/reject supply lists |
| `src/hooks/useAuditLog.ts` | Create: fetch audit log entries |
| `src/pages/InventoryPage.tsx` | Rewrite: quantity-based table, remove location, demand request flow |
| `src/pages/AddChutePage.tsx` | Rewrite: becomes "Add Stock" / "Supply List" page |
| `src/pages/RequestsPage.tsx` | Rewrite: show demand + supply lists with approve/reject/confirm |
| `src/pages/DashboardPage.tsx` | Update: use Supabase stock data, add low-stock alerts |
| `src/pages/StatisticsPage.tsx` | Update: use Supabase data |
| `src/pages/ArchivePage.tsx` | Update: show approved demand/supply list history |
| `src/pages/SettingsPage.tsx` | Add: Audit Log tab |
| `src/contexts/AuthContext.tsx` | Update: roles to engineer/magazinier/stock_manager |
| `src/components/AppLayout.tsx` | Update: nav labels |
| `src/components/ExcelImport.tsx` | Update: import creates stock rows with quantities, auto-merge |
| `src/lib/notifications.ts` | Add: demand_submitted, supply_submitted types |
| `src/lib/store.ts` | Keep for language/custom sizes only, remove chute/request functions |
| Migration SQL | Add stock trigger to prevent negative quantities |

## Database Migration

```sql
-- Trigger to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stock_quantity
  BEFORE UPDATE ON public.stock
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_stock();
```

## Role Mapping

| Old Role | New Role | Capabilities |
|----------|----------|-------------|
| store_manager | stock_manager | Approve/reject all lists, view audit log, manage users |
| engineer | engineer | Create demand lists |
| worker (magazinier) | magazinier | Create supply lists |

