CREATE POLICY "Magazinier can insert zero-qty stock"
ON public.stock FOR INSERT TO authenticated
WITH CHECK (has_role('magazinier'::app_role) AND quantity = 0);