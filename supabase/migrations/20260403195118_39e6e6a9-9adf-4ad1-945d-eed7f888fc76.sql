
-- Trigger to prevent negative stock
CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stock_quantity
  BEFORE UPDATE OR INSERT ON public.stock
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_negative_stock();

-- Attach triggers for demand/supply approval
CREATE TRIGGER on_demand_approval
  BEFORE UPDATE ON public.demand_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_demand_approval();

CREATE TRIGGER on_supply_approval
  BEFORE UPDATE ON public.supply_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supply_approval();

-- Trigger for handle_new_user on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow stock_manager to insert audit_log entries (for manual logging)
CREATE POLICY "Authenticated can insert audit log"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow profiles insert for the trigger
CREATE POLICY "Service can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow stock_manager to update profiles (role changes)
CREATE POLICY "Stock manager can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role('stock_manager'::app_role))
  WITH CHECK (has_role('stock_manager'::app_role));
