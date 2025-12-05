import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type WhatsAppProvider = "zapi" | "wasenderapi";

export interface OrganizationWhatsAppProvider {
  id: string;
  organization_id: string;
  provider: WhatsAppProvider;
  is_enabled: boolean;
  price_cents: number;
  created_at: string;
  updated_at: string;
}

export const PROVIDER_LABELS: Record<WhatsAppProvider, string> = {
  zapi: "API Brasileira",
  wasenderapi: "API Internacional",
};

export const PROVIDER_PRICES: Record<WhatsAppProvider, number> = {
  zapi: 19700, // R$ 197
  wasenderapi: 18500, // R$ 185
};

// Hook for fetching organization's enabled providers
export function useOrganizationWhatsAppProviders() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["org-whatsapp-providers", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("organization_whatsapp_providers")
        .select("*")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;
      return data as OrganizationWhatsAppProvider[];
    },
    enabled: !!profile?.organization_id,
  });
}

// Hook for super admin to fetch all org providers
export function useAllOrganizationProviders(organizationId: string | null) {
  return useQuery({
    queryKey: ["all-org-whatsapp-providers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("organization_whatsapp_providers")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return data as OrganizationWhatsAppProvider[];
    },
    enabled: !!organizationId,
  });
}

// Hook for super admin to toggle provider for an organization
export function useToggleOrganizationProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      provider,
      isEnabled,
      priceCents,
    }: {
      organizationId: string;
      provider: WhatsAppProvider;
      isEnabled: boolean;
      priceCents?: number;
    }) => {
      // Try to upsert
      const { error } = await supabase
        .from("organization_whatsapp_providers")
        .upsert(
          {
            organization_id: organizationId,
            provider,
            is_enabled: isEnabled,
            price_cents: priceCents ?? PROVIDER_PRICES[provider],
          },
          {
            onConflict: "organization_id,provider",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-org-whatsapp-providers", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["org-whatsapp-providers"] });
      toast({ title: "Provider atualizado!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook for updating provider price
export function useUpdateProviderPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      provider,
      priceCents,
    }: {
      organizationId: string;
      provider: WhatsAppProvider;
      priceCents: number;
    }) => {
      const { error } = await supabase
        .from("organization_whatsapp_providers")
        .update({ price_cents: priceCents })
        .eq("organization_id", organizationId)
        .eq("provider", provider);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-org-whatsapp-providers", variables.organizationId] });
      toast({ title: "Preço atualizado!" });
    },
  });
}
