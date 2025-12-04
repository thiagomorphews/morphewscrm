-- Create table for lead stage history
CREATE TABLE public.lead_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  stage funnel_stage NOT NULL,
  previous_stage funnel_stage,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view stage history of their org leads"
ON public.lead_stage_history
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert stage history for their org leads"
ON public.lead_stage_history
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- Index for faster queries
CREATE INDEX idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX idx_lead_stage_history_created_at ON public.lead_stage_history(created_at DESC);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_stage_history;