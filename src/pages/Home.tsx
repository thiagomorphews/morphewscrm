import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import Planos from "./Planos";

export default function Home() {
  const { user, profile, isLoading } = useAuth();

  // Check if onboarding is completed
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboarding-check", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      const { data, error } = await supabase
        .from("onboarding_data")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (error) {
        console.error("Error checking onboarding:", error);
        return null;
      }
      return data;
    },
    enabled: !!user && !!profile?.organization_id,
  });

  if (isLoading || (user && onboardingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in
  if (user) {
    // Check if onboarding is needed (user has org but no onboarding data)
    if (profile?.organization_id && !onboardingData) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Dashboard />;
  }

  // If not logged in, show landing page
  return <Planos />;
}
