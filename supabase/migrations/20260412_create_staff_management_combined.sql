-- Combined Staff Management Migration
-- This migration creates all tables needed for staff management and assignments
-- Note: tenant information is stored in profiles table with role='tenant'

-- Create staff management table
-- This table stores information about maintenance staff and their specialties

CREATE TABLE IF NOT EXISTS staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  specialty text NOT NULL check (specialty in (
    'plumbing', 'electrical', 'carpentry', 'painting', 'hvac', 
    'general', 'cleaning', 'pest_control', 'landscaping', 'security', 'other'
  )),
  company_name text,
  experience_years integer check (experience_years >= 0),
  hourly_rate decimal(10,2),
  availability text NOT NULL default 'available' check (availability in ('available', 'busy', 'unavailable')),
  rating decimal(3,2) check (rating >= 0 and rating <= 5),
  total_jobs integer default 0 check (total_jobs >= 0),
  is_active boolean NOT NULL default true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create maintenance requests table
-- This table stores tenant maintenance requests and complaints

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL check (category in (
    'plumbing', 'electrical', 'carpentry', 'painting', 'hvac', 
    'cleaning', 'pest_control', 'landscaping', 'security', 'appliance', 'structural', 'other'
  )),
  priority text NOT NULL default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL default 'pending' check (status in (
    'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected'
  )),
  assigned_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone,
  estimated_completion_date timestamp with time zone,
  actual_completion_date timestamp with time zone,
  cost_estimate decimal(10,2),
  actual_cost decimal(10,2),
  tenant_notes text,
  staff_notes text,
  landlord_notes text,
  photos text[], -- Array of photo URLs
  documents text[], -- Array of document URLs
  tenant_rating integer check (tenant_rating >= 1 and tenant_rating <= 5),
  staff_rating integer check (staff_rating >= 1 and tenant_rating <= 5),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create staff availability calendar table
-- This table tracks staff availability and schedules

CREATE TABLE IF NOT EXISTS staff_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL default 'available' check (status in ('available', 'booked', 'unavailable')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(staff_id, date, start_time)
);

-- Create maintenance request updates table
-- This table tracks all updates to maintenance requests

CREATE TABLE IF NOT EXISTS maintenance_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  update_type text NOT NULL check (update_type in (
    'created', 'assigned', 'status_change', 'note_added', 'photo_added', 
    'completed', 'cancelled', 'rating_added'
  )),
  previous_status text,
  new_status text,
  notes text,
  photos text[],
  created_at timestamp with time zone DEFAULT now()
);

-- Create staff assignments table
-- This table tracks which staff members are assigned to which tenants/properties

CREATE TABLE IF NOT EXISTS staff_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text,
  unit_id text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'active' check (status in ('active', 'completed', 'cancelled')),
  assigned_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable row level security
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table (only admins can manage staff)
CREATE POLICY "Admins can view all staff" ON staff FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Staff can view their own created staff" ON staff FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can insert staff" ON staff FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update staff" ON staff FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Staff can update their own created staff" ON staff FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can delete staff" ON staff FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Staff can delete their own created staff" ON staff FOR DELETE
  USING (created_by = auth.uid());

-- Create policies for maintenance requests
CREATE POLICY "Tenants can view their own requests" ON maintenance_requests FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all requests" ON maintenance_requests FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Tenants can create requests" ON maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Admins can update all requests" ON maintenance_requests FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Tenants can update their own requests" ON maintenance_requests FOR UPDATE
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

-- Create policies for staff availability
CREATE POLICY "Admins can manage staff availability" ON staff_availability FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for maintenance updates
CREATE POLICY "Tenants can view updates on their requests" ON maintenance_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests mr 
      WHERE mr.id = maintenance_updates.request_id 
      AND mr.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all updates" ON maintenance_updates FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can create updates" ON maintenance_updates FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Staff can create updates" ON maintenance_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = staff_id
    )
  );

-- Create policies for staff assignments
CREATE POLICY "Staff can view their own assignments" ON staff_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = staff_assignments.staff_id 
      AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their own assignments" ON staff_assignments FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all assignments" ON staff_assignments FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Staff can update their own assignments" ON staff_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = staff_assignments.staff_id 
      AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update all assignments" ON staff_assignments FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert assignments" ON staff_assignments FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can delete assignments" ON staff_assignments FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for better performance
CREATE INDEX idx_staff_specialty ON staff(specialty);
CREATE INDEX idx_staff_availability ON staff(availability);
CREATE INDEX idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_category ON maintenance_requests(category);
CREATE INDEX idx_maintenance_requests_assigned_staff ON maintenance_requests(assigned_staff_id);
CREATE INDEX idx_maintenance_updates_request_id ON maintenance_updates(request_id);
CREATE INDEX idx_staff_availability_staff_date ON staff_availability(staff_id, date);
CREATE INDEX idx_staff_assignments_staff_id ON staff_assignments(staff_id);
CREATE INDEX idx_staff_assignments_tenant_id ON staff_assignments(tenant_id);
CREATE INDEX idx_staff_assignments_status ON staff_assignments(status);
CREATE INDEX idx_staff_assignments_assigned_at ON staff_assignments(assigned_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically create maintenance update records
CREATE OR REPLACE FUNCTION create_maintenance_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Create update record for status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO maintenance_updates (
      request_id, 
      updated_by, 
      staff_id, 
      update_type, 
      previous_status, 
      new_status, 
      notes
    ) VALUES (
      NEW.id,
      auth.uid(),
      NEW.assigned_staff_id,
      'status_change',
      OLD.status,
      NEW.status,
      'Status automatically updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER maintenance_request_updates_trigger AFTER UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION create_maintenance_update_trigger();

-- Create function to update staff_assignments updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for staff_assignments updated_at
CREATE TRIGGER update_staff_assignments_updated_at BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_staff_assignments_updated_at();
