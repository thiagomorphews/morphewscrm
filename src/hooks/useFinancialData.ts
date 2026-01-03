import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, parseISO, isBefore, startOfDay } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

export interface FinancialInstallment {
  id: string;
  sale_id: string;
  organization_id: string;
  installment_number: number;
  total_installments: number;
  amount_cents: number;
  net_amount_cents: number | null;
  fee_cents: number | null;
  fee_percentage: number | null;
  due_date: string;
  status: 'pending' | 'confirmed' | 'overdue' | 'cancelled';
  confirmed_at: string | null;
  confirmed_by: string | null;
  payment_proof_url: string | null;
  notes: string | null;
  nsu_cv: string | null;
  card_brand: string | null;
  transaction_type: string | null;
  transaction_date: string | null;
  acquirer_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sale?: {
    id: string;
    created_at: string;
    total_cents: number;
    delivery_status: string | null;
    status: string;
    payment_method_id: string | null;
    payment_method?: {
      id: string;
      name: string;
      category: string | null;
      bank_destination_id: string | null;
      cnpj_destination_id: string | null;
      cost_center_id: string | null;
      acquirer_id: string | null;
    } | null;
    lead?: { 
      name: string; 
      whatsapp: string;
      city: string | null;
      state: string | null;
    } | null;
  };
  // Resolved names from joins
  bank_destination_name?: string | null;
  cnpj_destination?: string | null;
  cost_center_name?: string | null;
  acquirer_name?: string | null;
}

export interface FinancialSummary {
  // Totais gerais
  totalPending: number;
  totalConfirmed: number;
  totalOverdue: number;
  countPending: number;
  countConfirmed: number;
  countOverdue: number;
  // Recebimentos
  todayReceived: number;
  weekReceived: number;
  monthReceived: number;
  // Previstos
  todayExpected: number;
  weekExpected: number;
  monthExpected: number;
  // Taxas
  totalFees: number;
  // Líquido
  totalNetConfirmed: number;
  totalNetExpected: number;
}

export interface GroupedByCategory {
  category: string;
  categoryLabel: string;
  count: number;
  totalBruto: number;
  totalLiquido: number;
  totalTaxas: number;
  pendente: number;
  confirmado: number;
  atrasado: number;
}

export interface GroupedByCostCenter {
  costCenterId: string | null;
  costCenterName: string;
  count: number;
  totalBruto: number;
  totalLiquido: number;
  pendente: number;
  confirmado: number;
  atrasado: number;
  byCategory: GroupedByCategory[];
}

export interface GroupedByBank {
  bankId: string | null;
  bankName: string;
  cnpjId: string | null;
  cnpj: string;
  count: number;
  totalBruto: number;
  totalLiquido: number;
  pendente: number;
  confirmado: number;
  atrasado: number;
}

export interface CashFlowDay {
  date: string;
  dateLabel: string;
  expected: number;
  received: number;
  count: number;
}

export interface InstallmentFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  category?: string;
  costCenterId?: string;
  bankId?: string;
  cnpjId?: string;
  acquirerId?: string;
}

// =====================================================
// HELPERS
// =====================================================

const CATEGORY_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card_machine: 'Máquina de Cartão',
  bank_slip: 'Boleto',
  bank_transfer: 'Transferência',
  other: 'Outro',
};

function getCategoryLabel(category: string | null): string {
  return category ? CATEGORY_LABELS[category] || category : 'Não definido';
}

function isOverdue(status: string, dueDate: string): boolean {
  if (status !== 'pending') return false;
  const today = startOfDay(new Date());
  return isBefore(parseISO(dueDate), today);
}

// =====================================================
// MAIN DATA HOOK
// =====================================================

export function useFinancialInstallments(filters?: InstallmentFilters) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['financial-installments', filters],
    queryFn: async () => {
      // First, fetch installments with sales and payment methods
      let query = supabase
        .from('sale_installments')
        .select(`
          *,
          sale:sales!inner(
            id,
            created_at,
            total_cents,
            delivery_status,
            status,
            payment_method_id,
            payment_method:payment_methods(
              id,
              name,
              category,
              bank_destination_id,
              cnpj_destination_id,
              cost_center_id,
              acquirer_id
            ),
            lead:leads(name, whatsapp, city, state)
          )
        `)
        .order('due_date', { ascending: true });
      
      // Status filter
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'overdue') {
          // Overdue = pending with past due date
          const today = new Date().toISOString().split('T')[0];
          query = query.eq('status', 'pending').lt('due_date', today);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      
      // Date filters
      if (filters?.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('due_date', filters.endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Now fetch lookup tables for names
      const [bankRes, cnpjRes, costCenterRes, acquirerRes] = await Promise.all([
        supabase.from('payment_bank_destinations').select('id, name'),
        supabase.from('payment_cnpj_destinations').select('id, cnpj'),
        supabase.from('payment_cost_centers').select('id, name'),
        supabase.from('payment_acquirers').select('id, name'),
      ]);
      
      const bankMap = new Map((bankRes.data || []).map(b => [b.id, b.name]));
      const cnpjMap = new Map((cnpjRes.data || []).map(c => [c.id, c.cnpj]));
      const costCenterMap = new Map((costCenterRes.data || []).map(c => [c.id, c.name]));
      const acquirerMap = new Map((acquirerRes.data || []).map(a => [a.id, a.name]));
      
      // Enrich data with resolved names
      let results = (data || []).map(item => {
        const pm = item.sale?.payment_method;
        return {
          ...item,
          status: item.status as 'pending' | 'confirmed' | 'overdue' | 'cancelled',
          bank_destination_name: pm?.bank_destination_id ? bankMap.get(pm.bank_destination_id) : null,
          cnpj_destination: pm?.cnpj_destination_id ? cnpjMap.get(pm.cnpj_destination_id) : null,
          cost_center_name: pm?.cost_center_id ? costCenterMap.get(pm.cost_center_id) : null,
          acquirer_name: item.acquirer_id 
            ? acquirerMap.get(item.acquirer_id) 
            : (pm?.acquirer_id ? acquirerMap.get(pm.acquirer_id) : null),
        } as FinancialInstallment;
      });
      
      // Client-side filters
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(item => 
          item.sale?.lead?.name?.toLowerCase().includes(searchLower) ||
          item.sale?.lead?.whatsapp?.includes(filters.search!) ||
          item.nsu_cv?.includes(filters.search!)
        );
      }
      
      if (filters?.category) {
        results = results.filter(item => 
          item.sale?.payment_method?.category === filters.category
        );
      }
      
      if (filters?.costCenterId) {
        results = results.filter(item => 
          item.sale?.payment_method?.cost_center_id === filters.costCenterId
        );
      }
      
      if (filters?.bankId) {
        results = results.filter(item => 
          item.sale?.payment_method?.bank_destination_id === filters.bankId
        );
      }
      
      if (filters?.cnpjId) {
        results = results.filter(item => 
          item.sale?.payment_method?.cnpj_destination_id === filters.cnpjId
        );
      }
      
      if (filters?.acquirerId) {
        results = results.filter(item => 
          item.acquirer_id === filters.acquirerId || 
          item.sale?.payment_method?.acquirer_id === filters.acquirerId
        );
      }
      
      return results;
    },
    enabled: !!profile?.organization_id,
  });
}

// =====================================================
// SUMMARY HOOK
// =====================================================

export function useFinancialSummary() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['financial-summary-complete'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('sale_installments')
        .select('status, amount_cents, net_amount_cents, fee_cents, confirmed_at, due_date');
      
      if (error) throw error;
      
      const summary: FinancialSummary = {
        totalPending: 0,
        totalConfirmed: 0,
        totalOverdue: 0,
        countPending: 0,
        countConfirmed: 0,
        countOverdue: 0,
        todayReceived: 0,
        weekReceived: 0,
        monthReceived: 0,
        todayExpected: 0,
        weekExpected: 0,
        monthExpected: 0,
        totalFees: 0,
        totalNetConfirmed: 0,
        totalNetExpected: 0,
      };
      
      (data || []).forEach(item => {
        const amount = item.amount_cents || 0;
        const net = item.net_amount_cents || amount;
        const fee = item.fee_cents || 0;
        
        if (item.status === 'pending') {
          if (isOverdue(item.status, item.due_date)) {
            summary.totalOverdue += amount;
            summary.countOverdue++;
          } else {
            summary.totalPending += amount;
            summary.countPending++;
            
            // Expected by period
            if (item.due_date === todayStr) {
              summary.todayExpected += amount;
            }
            if (item.due_date >= weekStart && item.due_date <= weekEnd) {
              summary.weekExpected += amount;
            }
            if (item.due_date >= monthStart && item.due_date <= monthEnd) {
              summary.monthExpected += amount;
            }
          }
          summary.totalNetExpected += net;
        } else if (item.status === 'confirmed') {
          summary.totalConfirmed += amount;
          summary.countConfirmed++;
          summary.totalFees += fee;
          summary.totalNetConfirmed += net;
          
          const confirmedDate = item.confirmed_at?.split('T')[0];
          if (confirmedDate === todayStr) {
            summary.todayReceived += amount;
          }
          if (confirmedDate && confirmedDate >= weekStart && confirmedDate <= weekEnd) {
            summary.weekReceived += amount;
          }
          if (confirmedDate && confirmedDate >= monthStart && confirmedDate <= monthEnd) {
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

// =====================================================
// GROUPED BY COST CENTER
// =====================================================

export function useFinancialByCostCenter() {
  const { data: installments, isLoading, error } = useFinancialInstallments();
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['financial-by-cost-center', installments?.length],
    queryFn: async () => {
      if (!installments) return [];
      
      const grouped = new Map<string, GroupedByCostCenter>();
      
      installments.forEach(item => {
        const costCenterId = item.sale?.payment_method?.cost_center_id || 'none';
        const costCenterName = item.cost_center_name || 'Sem Centro de Custo';
        const category = item.sale?.payment_method?.category || 'other';
        const categoryLabel = getCategoryLabel(category);
        
        if (!grouped.has(costCenterId)) {
          grouped.set(costCenterId, {
            costCenterId: costCenterId === 'none' ? null : costCenterId,
            costCenterName,
            count: 0,
            totalBruto: 0,
            totalLiquido: 0,
            pendente: 0,
            confirmado: 0,
            atrasado: 0,
            byCategory: [],
          });
        }
        
        const group = grouped.get(costCenterId)!;
        const amount = item.amount_cents || 0;
        const net = item.net_amount_cents || amount;
        const fee = item.fee_cents || 0;
        
        group.count++;
        group.totalBruto += amount;
        group.totalLiquido += net;
        
        if (item.status === 'confirmed') {
          group.confirmado += amount;
        } else if (isOverdue(item.status, item.due_date)) {
          group.atrasado += amount;
        } else if (item.status === 'pending') {
          group.pendente += amount;
        }
        
        // Group by category within cost center
        let catGroup = group.byCategory.find(c => c.category === category);
        if (!catGroup) {
          catGroup = {
            category,
            categoryLabel,
            count: 0,
            totalBruto: 0,
            totalLiquido: 0,
            totalTaxas: 0,
            pendente: 0,
            confirmado: 0,
            atrasado: 0,
          };
          group.byCategory.push(catGroup);
        }
        
        catGroup.count++;
        catGroup.totalBruto += amount;
        catGroup.totalLiquido += net;
        catGroup.totalTaxas += fee;
        
        if (item.status === 'confirmed') {
          catGroup.confirmado += amount;
        } else if (isOverdue(item.status, item.due_date)) {
          catGroup.atrasado += amount;
        } else if (item.status === 'pending') {
          catGroup.pendente += amount;
        }
      });
      
      return Array.from(grouped.values()).sort((a, b) => b.totalBruto - a.totalBruto);
    },
    enabled: !!profile?.organization_id && !!installments,
  });
}

// =====================================================
// GROUPED BY BANK/CNPJ
// =====================================================

export function useFinancialByBank() {
  const { data: installments } = useFinancialInstallments();
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['financial-by-bank', installments?.length],
    queryFn: async () => {
      if (!installments) return [];
      
      const grouped = new Map<string, GroupedByBank>();
      
      installments.forEach(item => {
        const bankId = item.sale?.payment_method?.bank_destination_id || 'none';
        const cnpjId = item.sale?.payment_method?.cnpj_destination_id || 'none';
        const key = `${bankId}|${cnpjId}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            bankId: bankId === 'none' ? null : bankId,
            bankName: item.bank_destination_name || 'Sem Banco',
            cnpjId: cnpjId === 'none' ? null : cnpjId,
            cnpj: item.cnpj_destination || 'Sem CNPJ',
            count: 0,
            totalBruto: 0,
            totalLiquido: 0,
            pendente: 0,
            confirmado: 0,
            atrasado: 0,
          });
        }
        
        const group = grouped.get(key)!;
        const amount = item.amount_cents || 0;
        const net = item.net_amount_cents || amount;
        
        group.count++;
        group.totalBruto += amount;
        group.totalLiquido += net;
        
        if (item.status === 'confirmed') {
          group.confirmado += amount;
        } else if (isOverdue(item.status, item.due_date)) {
          group.atrasado += amount;
        } else if (item.status === 'pending') {
          group.pendente += amount;
        }
      });
      
      return Array.from(grouped.values()).sort((a, b) => b.totalBruto - a.totalBruto);
    },
    enabled: !!profile?.organization_id && !!installments,
  });
}

// =====================================================
// CASH FLOW (NEXT 30 DAYS)
// =====================================================

export function useCashFlow(days: number = 30) {
  const { data: installments } = useFinancialInstallments();
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['cash-flow', days, installments?.length],
    queryFn: async () => {
      if (!installments) return [];
      
      const today = startOfDay(new Date());
      const cashFlow: CashFlowDay[] = [];
      
      // Create entries for next N days
      for (let i = 0; i < days; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        cashFlow.push({
          date: dateStr,
          dateLabel: format(date, 'dd/MM'),
          expected: 0,
          received: 0,
          count: 0,
        });
      }
      
      // Populate with installment data
      installments.forEach(item => {
        const dueDate = item.due_date;
        const dayEntry = cashFlow.find(d => d.date === dueDate);
        
        if (dayEntry) {
          dayEntry.count++;
          if (item.status === 'confirmed') {
            dayEntry.received += item.amount_cents || 0;
          } else if (item.status === 'pending') {
            dayEntry.expected += item.amount_cents || 0;
          }
        }
      });
      
      return cashFlow;
    },
    enabled: !!profile?.organization_id && !!installments,
  });
}

// =====================================================
// LOOKUP DATA HOOKS
// =====================================================

export function useCostCenters() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_cost_centers')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useBankDestinations() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['bank-destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_bank_destinations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCnpjDestinations() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['cnpj-destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_cnpj_destinations')
        .select('id, cnpj')
        .order('cnpj');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useAcquirers() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['acquirers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_acquirers')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}

// Re-export types from old hook for backwards compatibility if needed
export type { FinancialInstallment as SaleInstallment };
