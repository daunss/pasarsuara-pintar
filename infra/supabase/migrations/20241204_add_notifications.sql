-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'transaction', 'payment', 'inventory', 'whatsapp', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  user_message TEXT,
  details JSONB,
  stack TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  url TEXT
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_type ON error_logs(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for error_logs (admin only)
CREATE POLICY "Only admins can view error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on new transaction
CREATE OR REPLACE FUNCTION notify_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.user_id,
    'transaction',
    'Transaksi Baru',
    'Transaksi ' || NEW.type || ' sebesar Rp ' || NEW.total_amount || ' telah dicatat',
    jsonb_build_object('transaction_id', NEW.id, 'type', NEW.type, 'amount', NEW.total_amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_transaction();

-- Trigger to create notification on low inventory
CREATE OR REPLACE FUNCTION notify_low_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.min_stock AND (OLD.quantity IS NULL OR OLD.quantity > NEW.min_stock) THEN
    PERFORM create_notification(
      NEW.user_id,
      'inventory',
      'Stok Menipis',
      'Produk ' || NEW.product_name || ' tinggal ' || NEW.quantity || ' unit',
      jsonb_build_object('product_id', NEW.id, 'quantity', NEW.quantity, 'min_stock', NEW.min_stock)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_low_inventory
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_inventory();

-- Trigger to create notification on payment status change
CREATE OR REPLACE FUNCTION notify_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status != OLD.payment_status THEN
    PERFORM create_notification(
      NEW.user_id,
      'payment',
      'Status Pembayaran Berubah',
      'Pembayaran untuk transaksi #' || NEW.id || ' sekarang ' || NEW.payment_status,
      jsonb_build_object('transaction_id', NEW.id, 'status', NEW.payment_status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_payment_status
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION notify_payment_status();
