
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
