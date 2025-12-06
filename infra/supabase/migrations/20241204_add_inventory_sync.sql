-- Add marketplace sync fields to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marketplace_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marketplace_product_id VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Create inventory sync log table
CREATE TABLE IF NOT EXISTS inventory_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'sync', 'update', 'error'
  status VARCHAR(50) NOT NULL, -- 'success', 'failed'
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment reconciliation table
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_provider VARCHAR(50) NOT NULL, -- 'midtrans', 'manual', etc.
  payment_reference VARCHAR(255), -- External payment ID
  expected_amount DECIMAL(15,2) NOT NULL,
  received_amount DECIMAL(15,2),
  status VARCHAR(50) NOT NULL, -- 'pending', 'matched', 'mismatch', 'missing'
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_inventory_marketplace_synced ON inventory(marketplace_synced);
CREATE INDEX idx_inventory_marketplace_product_id ON inventory(marketplace_product_id);
CREATE INDEX idx_inventory_sync_logs_inventory_id ON inventory_sync_logs(inventory_id);
CREATE INDEX idx_payment_reconciliations_transaction_id ON payment_reconciliations(transaction_id);
CREATE INDEX idx_payment_reconciliations_status ON payment_reconciliations(status);
CREATE INDEX idx_payment_reconciliations_payment_reference ON payment_reconciliations(payment_reference);

-- Enable RLS
ALTER TABLE inventory_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own inventory sync logs"
  ON inventory_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_sync_logs.inventory_id
      AND inventory.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert inventory sync logs"
  ON inventory_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own payment reconciliations"
  ON payment_reconciliations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = payment_reconciliations.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own payment reconciliations"
  ON payment_reconciliations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = payment_reconciliations.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert payment reconciliations"
  ON payment_reconciliations FOR INSERT
  WITH CHECK (true);

-- Function to sync inventory to marketplace
CREATE OR REPLACE FUNCTION sync_inventory_to_marketplace(p_inventory_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_inventory inventory%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get inventory details
  SELECT * INTO v_inventory FROM inventory WHERE id = p_inventory_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory not found');
  END IF;
  
  -- Update sync status
  UPDATE inventory
  SET marketplace_synced = TRUE,
      last_sync_at = NOW()
  WHERE id = p_inventory_id;
  
  -- Log sync
  INSERT INTO inventory_sync_logs (inventory_id, action, status, details)
  VALUES (
    p_inventory_id,
    'sync',
    'success',
    jsonb_build_object(
      'product_name', v_inventory.product_name,
      'quantity', v_inventory.quantity,
      'price', v_inventory.sell_price
    )
  );
  
  RETURN jsonb_build_object('success', true, 'inventory_id', p_inventory_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update inventory quantity and sync
CREATE OR REPLACE FUNCTION update_inventory_with_sync(
  p_inventory_id UUID,
  p_quantity_change DECIMAL,
  p_reason VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_new_quantity DECIMAL;
BEGIN
  -- Update quantity
  UPDATE inventory
  SET quantity = quantity + p_quantity_change,
      updated_at = NOW()
  WHERE id = p_inventory_id
  RETURNING quantity INTO v_new_quantity;
  
  -- Mark as needing sync
  UPDATE inventory
  SET marketplace_synced = FALSE
  WHERE id = p_inventory_id;
  
  -- Log the change
  INSERT INTO inventory_sync_logs (inventory_id, action, status, details)
  VALUES (
    p_inventory_id,
    'update',
    'success',
    jsonb_build_object(
      'quantity_change', p_quantity_change,
      'new_quantity', v_new_quantity,
      'reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'new_quantity', v_new_quantity,
    'needs_sync', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create payment reconciliation
CREATE OR REPLACE FUNCTION create_payment_reconciliation(
  p_transaction_id UUID,
  p_payment_provider VARCHAR,
  p_payment_reference VARCHAR,
  p_expected_amount DECIMAL,
  p_received_amount DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_reconciliation_id UUID;
  v_status VARCHAR;
BEGIN
  -- Determine status
  IF p_received_amount IS NULL THEN
    v_status := 'pending';
  ELSIF p_received_amount = p_expected_amount THEN
    v_status := 'matched';
  ELSIF p_received_amount != p_expected_amount THEN
    v_status := 'mismatch';
  ELSE
    v_status := 'pending';
  END IF;
  
  -- Insert reconciliation record
  INSERT INTO payment_reconciliations (
    transaction_id,
    payment_provider,
    payment_reference,
    expected_amount,
    received_amount,
    status,
    reconciled_at
  )
  VALUES (
    p_transaction_id,
    p_payment_provider,
    p_payment_reference,
    p_expected_amount,
    p_received_amount,
    v_status,
    CASE WHEN v_status = 'matched' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_reconciliation_id;
  
  -- Update transaction payment status if matched
  IF v_status = 'matched' THEN
    UPDATE transactions
    SET payment_status = 'PAID'
    WHERE id = p_transaction_id;
  END IF;
  
  RETURN v_reconciliation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create reconciliation on transaction insert
CREATE OR REPLACE FUNCTION auto_create_reconciliation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method IS NOT NULL AND NEW.total_amount > 0 THEN
    PERFORM create_payment_reconciliation(
      NEW.id,
      COALESCE(NEW.payment_method, 'manual'),
      NEW.payment_reference,
      NEW.total_amount,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_reconciliation
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.type IN ('SALE', 'PURCHASE'))
  EXECUTE FUNCTION auto_create_reconciliation();

-- Trigger to update inventory sync status on quantity change
CREATE OR REPLACE FUNCTION mark_inventory_needs_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity != OLD.quantity THEN
    NEW.marketplace_synced := FALSE;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_inventory_needs_sync
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION mark_inventory_needs_sync();

-- Function to get unsynced inventory
CREATE OR REPLACE FUNCTION get_unsynced_inventory(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  product_name VARCHAR,
  quantity DECIMAL,
  sell_price DECIMAL,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.product_name,
    i.quantity,
    i.sell_price,
    i.last_sync_at
  FROM inventory i
  WHERE i.user_id = p_user_id
  AND (i.marketplace_synced = FALSE OR i.marketplace_synced IS NULL)
  ORDER BY i.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reconciliations
CREATE OR REPLACE FUNCTION get_pending_reconciliations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  transaction_id UUID,
  payment_provider VARCHAR,
  payment_reference VARCHAR,
  expected_amount DECIMAL,
  received_amount DECIMAL,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.transaction_id,
    pr.payment_provider,
    pr.payment_reference,
    pr.expected_amount,
    pr.received_amount,
    pr.status,
    pr.created_at
  FROM payment_reconciliations pr
  JOIN transactions t ON t.id = pr.transaction_id
  WHERE t.user_id = p_user_id
  AND pr.status IN ('pending', 'mismatch')
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
