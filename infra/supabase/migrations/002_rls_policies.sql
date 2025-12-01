-- ===========================================
-- PasarSuara Pintar - RLS Policies
-- ===========================================

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Inventory policies
CREATE POLICY "Users can view own inventory" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON public.inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON public.inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON public.inventory
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Negotiation logs policies
CREATE POLICY "Users can view negotiations as buyer or seller" ON public.negotiation_logs
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert negotiations as buyer" ON public.negotiation_logs
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update negotiations" ON public.negotiation_logs
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Service role bypass policies (untuk backend/agents)
CREATE POLICY "Service role full access users" ON public.users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access inventory" ON public.inventory
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access transactions" ON public.transactions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access negotiation_logs" ON public.negotiation_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
