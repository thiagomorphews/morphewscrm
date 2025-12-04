import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FunnelStage } from '@/types/lead';

export interface LeadStageHistory {
  id: string;
  lead_id: string;
  organization_id: string;
  stage: FunnelStage;
  previous_stage: FunnelStage | null;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export function useLeadStageHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-stage-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching lead stage history:', error);
        throw error;
      }

      return data as LeadStageHistory[];
    },
    enabled: !!leadId,
  });
}

interface AddStageHistoryParams {
  lead_id: string;
  organization_id: string;
  stage: FunnelStage;
  previous_stage?: FunnelStage | null;
  reason?: string | null;
  changed_by?: string | null;
}

export function useAddStageHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddStageHistoryParams) => {
      const { data, error } = await supabase
        .from('lead_stage_history')
        .insert({
          lead_id: params.lead_id,
          organization_id: params.organization_id,
          stage: params.stage,
          previous_stage: params.previous_stage || null,
          reason: params.reason || null,
          changed_by: params.changed_by || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding stage history:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-stage-history', data.lead_id] });
    },
  });
}
