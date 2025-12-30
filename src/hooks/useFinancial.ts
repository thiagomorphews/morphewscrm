import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// =====================================================
// TYPES
// =====================================================

export interface SaleInstallment {
  id: string;
  sale_id: string;
  organization_id: string;
  installment_number: number;
  total_installments: number;
  amount_cents: number;
  due_date: string;
  status: 'pending' | 'confirmed' | 'overdue' | 'cancelled';
  confirmed_at: string | null;
  confirmed_by: string | null;
  payment_proof_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sale?: {
    id: string;
    created_at: string;
    total_cents: number;
    payment_method?: { name: string } | null;
    lead?: { name: string; whatsapp: string } | null;
  };
}

export interface InstallmentHistory {
  id: string;
  installment_id: string;
  organization_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  changed_by_profile?: { first_name: string; last_name: string } | null;
}

export interface FinancialSummary {
  totalPending: number;
  totalConfirmed: number;
  totalOverdue: number;
  countPending: number;
  countConfirmed: number;
  countOverdue: number;
  todayReceived: number;
  monthReceived: number;
}

// =====================================================
// HOOKS
// =====================================================

export function useInstallments(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['sale-installments', filters],
    queryFn: async () => {
      let query = supabase
        .from('sale_installments')
        .select(`
          *,
          sale:sales(
            id,
            created_at,
            total_cents,
            payment_method:payment_methods(name),
            lead:leads(name, whatsapp)
          )
        `)
        .order('due_date', { ascending: true });
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('due_date', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by search client-side (lead name)
      let results = data as SaleInstallment[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(item => 
          item.sale?.lead?.name?.toLowerCase().includes(searchLower) ||
          item.sale?.lead?.whatsapp?.includes(filters.search!)
        );
      }
      
      return results;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useInstallmentById(id: string | null) {
  return useQuery({
    queryKey: ['sale-installment', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('sale_installments')
        .select(`
          *,
          sale:sales(
            id,
            created_at,
            total_cents,
            payment_method:payment_methods(name),
            lead:leads(name, whatsapp, email, city, state)
          )
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as SaleInstallment | null;
    },
    enabled: !!id,
  });
}

export function useInstallmentHistory(installmentId: string | null) {
  return useQuery({
    queryKey: ['installment-history', installmentId],
    queryFn: async () => {
      if (!installmentId) return [];
      
      const { data, error } = await supabase
        .from('installment_history')
        .select('*')
        .eq('installment_id', installmentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InstallmentHistory[];
    },
    enabled: !!installmentId,
  });
}

export function useFinancialSummary() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sale_installments')
        .select('status, amount_cents, confirmed_at, due_date');
      
      if (error) throw error;
      
      const summary: FinancialSummary = {
        totalPending: 0,
        totalConfirmed: 0,
        totalOverdue: 0,
        countPending: 0,
        countConfirmed: 0,
        countOverdue: 0,
        todayReceived: 0,
        monthReceived: 0,
      };
      
      data.forEach(item => {
        const amount = item.amount_cents || 0;
        
        if (item.status === 'pending') {
          // Check if overdue
          if (item.due_date && item.due_date < today) {
            summary.totalOverdue += amount;
            summary.countOverdue++;
          } else {
            summary.totalPending += amount;
            summary.countPending++;
          }
        } else if (item.status === 'confirmed') {
          summary.totalConfirmed += amount;
          summary.countConfirmed++;
          
          // Check if confirmed today
          if (item.confirmed_at?.startsWith(today)) {
            summary.todayReceived += amount;
          }
          
          // Check if confirmed this month
          if (item.confirmed_at && item.confirmed_at >= firstDayOfMonth) {
            summary.monthReceived += amount;
          }
        } else if (item.status === 'overdue') {
          summary.totalOverdue += amount;
          summary.countOverdue++;
        }
      });
      
      return summary;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useConfirmInstallment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      notes?: string; 
      payment_proof_url?: string;
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Get current installment
      const { data: current } = await supabase
        .from('sale_installments')
        .select('status')
        .eq('id', data.id)
        .single();
      
      // Update installment
      const { data: installment, error } = await supabase
        .from('sale_installments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id,
          notes: data.notes,
          payment_proof_url: data.payment_proof_url,
        })
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log history
      await supabase.from('installment_history').insert({
        installment_id: data.id,
        organization_id: profile.organization_id,
        previous_status: current?.status,
        new_status: 'confirmed',
        changed_by: user?.id,
        notes: data.notes || 'Pagamento confirmado',
      });
      
      return installment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-installments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      status?: string;
      notes?: string; 
      payment_proof_url?: string;
      due_date?: string;
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Get current installment
      const { data: current } = await supabase
        .from('sale_installments')
        .select('status')
        .eq('id', data.id)
        .single();
      
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.payment_proof_url !== undefined) updateData.payment_proof_url = data.payment_proof_url;
      if (data.due_date) updateData.due_date = data.due_date;
      
      if (data.status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = user?.id;
      }
      
      const { data: installment, error } = await supabase
        .from('sale_installments')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log history if status changed
      if (data.status && data.status !== current?.status) {
        await supabase.from('installment_history').insert({
          installment_id: data.id,
          organization_id: profile.organization_id,
          previous_status: current?.status,
          new_status: data.status,
          changed_by: user?.id,
          notes: data.notes,
        });
      }
      
      return installment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-installments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
}

export function useCreateInstallmentsForSale() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      sale_id: string;
      total_cents: number;
      installments: number;
      first_due_date: Date;
      payment_method_id?: string;
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Get settlement days from payment method if provided
      let settlementDays = 30; // Default
      if (data.payment_method_id) {
        const { data: method } = await supabase
          .from('payment_methods')
          .select('settlement_days, payment_timing')
          .eq('id', data.payment_method_id)
          .single();
        
        if (method?.settlement_days) {
          settlementDays = method.settlement_days;
        }
        if (method?.payment_timing === 'immediate') {
          settlementDays = 0;
        }
      }
      
      const amountPerInstallment = Math.floor(data.total_cents / data.installments);
      const remainder = data.total_cents - (amountPerInstallment * data.installments);
      
      const installmentsToCreate = [];
      
      for (let i = 0; i < data.installments; i++) {
        const dueDate = new Date(data.first_due_date);
        dueDate.setDate(dueDate.getDate() + (i * settlementDays));
        
        installmentsToCreate.push({
          sale_id: data.sale_id,
          organization_id: profile.organization_id,
          installment_number: i + 1,
          total_installments: data.installments,
          amount_cents: amountPerInstallment + (i === 0 ? remainder : 0),
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
        });
      }
      
      const { data: created, error } = await supabase
        .from('sale_installments')
        .insert(installmentsToCreate)
        .select();
      
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-installments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
}
