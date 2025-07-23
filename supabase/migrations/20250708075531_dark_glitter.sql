/*
  # Create Backend Integration Tables

  1. New Tables
    - `campaign_sequences` - Message sequence steps for campaigns
    - `conversation_history` - All message logs and call records  
    - `training_resources` - AI training materials (notes, links, files)
    - `bookings` - Booking records and status
    - `lead_sequence_progress` - Progress tracking for lead sequences

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access data they own or that belongs to their campaigns

  3. Indexes
    - Add indexes for frequently queried columns
    - Optimize for campaign and lead lookups
*/

-- Campaign Sequences Table
CREATE TABLE IF NOT EXISTS campaign_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('call', 'sms', 'whatsapp', 'email')),
  message_content text,
  delay_hours integer NOT NULL DEFAULT 0,
  conditions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sequences for their campaigns"
  ON campaign_sequences
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Conversation History Table
CREATE TABLE IF NOT EXISTS conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES uploaded_leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('call', 'sms', 'whatsapp', 'email')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content text,
  response_received boolean DEFAULT false,
  call_duration integer,
  call_recording_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation history for their leads"
  ON conversation_history
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Training Resources Table
CREATE TABLE IF NOT EXISTS training_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('note', 'file', 'link')),
  title text,
  content text,
  file_url text,
  link_url text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own training resources"
  ON training_resources
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES uploaded_leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  booking_type text NOT NULL CHECK (booking_type IN ('calendar', 'manual', 'reply')),
  booking_date timestamptz,
  booking_url text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bookings for their leads"
  ON bookings
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Lead Sequence Progress Table
CREATE TABLE IF NOT EXISTS lead_sequence_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES uploaded_leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 1,
  last_contact_date timestamptz,
  next_contact_date timestamptz,
  completed boolean DEFAULT false,
  paused boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lead_sequence_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sequence progress for their leads"
  ON lead_sequence_progress
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_sequences_campaign_id ON campaign_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sequences_step_number ON campaign_sequences(campaign_id, step_number);

CREATE INDEX IF NOT EXISTS idx_conversation_history_lead_id ON conversation_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_campaign_id ON conversation_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_resources_user_id ON training_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_training_resources_campaign_id ON training_resources(campaign_id);
CREATE INDEX IF NOT EXISTS idx_training_resources_type ON training_resources(resource_type);

CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON bookings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_lead_sequence_progress_lead_id ON lead_sequence_progress(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sequence_progress_campaign_id ON lead_sequence_progress(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_sequence_progress_next_contact ON lead_sequence_progress(next_contact_date);

-- Update function for lead_sequence_progress
CREATE OR REPLACE FUNCTION update_lead_sequence_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_sequence_progress_updated_at
  BEFORE UPDATE ON lead_sequence_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_sequence_progress_updated_at();