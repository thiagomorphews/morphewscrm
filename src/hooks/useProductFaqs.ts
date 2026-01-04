import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ProductFaq {
  id: string;
  product_id: string;
  organization_id: string;
  question: string;
  answer: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFaqFormData {
  id?: string;
  question: string;
  answer: string;
  position: number;
}

export function useProductFaqs(productId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['product-faqs', productId],
    queryFn: async () => {
      if (!productId || !profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('product_faqs')
        .select('*')
        .eq('product_id', productId)
        .eq('organization_id', profile.organization_id)
        .order('position');

      if (error) throw error;
      return data as ProductFaq[];
    },
    enabled: !!productId && !!profile?.organization_id,
  });
}

export function useSaveProductFaqs() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      productId,
      faqs,
    }: {
      productId: string;
      faqs: ProductFaqFormData[];
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      // Delete existing FAQs for this product
      await supabase
        .from('product_faqs')
        .delete()
        .eq('product_id', productId)
        .eq('organization_id', profile.organization_id);

      // Insert new FAQs (filter out empty ones)
      const validFaqs = faqs.filter(
        (faq) => faq.question.trim() !== '' && faq.answer.trim() !== ''
      );

      if (validFaqs.length > 0) {
        const { error } = await supabase.from('product_faqs').insert(
          validFaqs.map((faq, index) => ({
            product_id: productId,
            organization_id: profile.organization_id,
            question: faq.question,
            answer: faq.answer,
            position: index,
          }))
        );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-faqs', variables.productId] });
    },
  });
}
