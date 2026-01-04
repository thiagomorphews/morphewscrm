import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ProductIngredient {
  id: string;
  product_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredientFormData {
  id?: string;
  name: string;
  description: string | null;
  position: number;
}

export function useProductIngredients(productId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['product-ingredients', productId],
    queryFn: async () => {
      if (!productId || !profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('product_ingredients')
        .select('*')
        .eq('product_id', productId)
        .eq('organization_id', profile.organization_id)
        .order('position');

      if (error) throw error;
      return data as ProductIngredient[];
    },
    enabled: !!productId && !!profile?.organization_id,
  });
}

export function useSaveProductIngredients() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      productId,
      ingredients,
    }: {
      productId: string;
      ingredients: ProductIngredientFormData[];
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      // Delete existing ingredients for this product
      await supabase
        .from('product_ingredients')
        .delete()
        .eq('product_id', productId)
        .eq('organization_id', profile.organization_id);

      // Insert new ingredients (filter out empty ones)
      const validIngredients = ingredients.filter(
        (ing) => ing.name.trim() !== ''
      );

      if (validIngredients.length > 0) {
        const { error } = await supabase.from('product_ingredients').insert(
          validIngredients.map((ing, index) => ({
            product_id: productId,
            organization_id: profile.organization_id,
            name: ing.name,
            description: ing.description,
            position: index,
          }))
        );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', variables.productId] });
    },
  });
}
