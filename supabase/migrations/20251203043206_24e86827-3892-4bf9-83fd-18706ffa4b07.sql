-- Fix RLS policies for leads table
DROP POLICY IF EXISTS "Anyone can view leads" ON leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON leads;

CREATE POLICY "Authenticated users can view leads"
ON leads FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
ON leads FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete leads"
ON leads FOR DELETE
TO authenticated
USING (true);

-- Fix RLS policies for lead_events table
DROP POLICY IF EXISTS "Anyone can view lead events" ON lead_events;
DROP POLICY IF EXISTS "Anyone can insert lead events" ON lead_events;
DROP POLICY IF EXISTS "Anyone can update lead events" ON lead_events;
DROP POLICY IF EXISTS "Anyone can delete lead events" ON lead_events;

CREATE POLICY "Authenticated users can view lead events"
ON lead_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert lead events"
ON lead_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead events"
ON lead_events FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete lead events"
ON lead_events FOR DELETE
TO authenticated
USING (true);