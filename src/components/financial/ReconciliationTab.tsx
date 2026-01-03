import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useFinancialInstallments, 
  useAcquirers,
  type FinancialInstallment 
} from '@/hooks/useFinancialData';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Search,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Calendar
} from 'lucide-react';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CARD_BRANDS: Record<string, string> = {
  visa: 'Visa',
  master: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  banricompras: 'Banricompras',
};

const TRANSACTION_TYPES: Record<string, string> = {
  debit: 'Débito',
  credit: 'Crédito à Vista',
  credit_installment: 'Crédito Parcelado',
};

interface ReconciliationItemProps {
  item: FinancialInstallment;
  onReconcile: (item: FinancialInstallment) => void;
}

function ReconciliationStatus({ item }: { item: FinancialInstallment }) {
  const hasFullData = item.nsu_cv && item.card_brand && item.transaction_type && item.transaction_date;
  const isConfirmed = item.status === 'confirmed';
  
  if (isConfirmed && hasFullData) {
    return (
      <Badge className="bg-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Conciliado
      </Badge>
    );
  }
  
  if (isConfirmed && !hasFullData) {
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        Dados Incompletos
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="border-muted-foreground">
      Pendente
    </Badge>
  );
}

export function ReconciliationTab() {
  const [search, setSearch] = useState('');
  const [acquirerFilter, setAcquirerFilter] = useState<string>('all');
  
  const { data: installments, isLoading } = useFinancialInstallments({
    category: 'card_machine',
  });
  const { data: acquirers } = useAcquirers();
  
  // Filter installments
  const filteredInstallments = (installments || []).filter(item => {
    // Must be confirmed for reconciliation
    if (item.status !== 'confirmed') return false;
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.sale?.lead?.name?.toLowerCase().includes(searchLower) ||
        item.nsu_cv?.includes(search) ||
        item.sale?.lead?.whatsapp?.includes(search);
      if (!matchesSearch) return false;
    }
    
    // Acquirer filter
    if (acquirerFilter !== 'all') {
      const itemAcquirer = item.acquirer_id || item.sale?.payment_method?.acquirer_id;
      if (itemAcquirer !== acquirerFilter) return false;
    }
    
    return true;
  });
  
  // Calculate stats
  const stats = {
    total: filteredInstallments.length,
    reconciled: filteredInstallments.filter(i => i.nsu_cv && i.card_brand && i.transaction_type).length,
    incomplete: filteredInstallments.filter(i => !i.nsu_cv || !i.card_brand || !i.transaction_type).length,
    totalValue: filteredInstallments.reduce((sum, i) => sum + i.amount_cents, 0),
    totalNet: filteredInstallments.reduce((sum, i) => sum + (i.net_amount_cents || i.amount_cents), 0),
    totalFees: filteredInstallments.reduce((sum, i) => sum + (i.fee_cents || 0), 0),
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <FileCheck className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Conciliação de Cartões</CardTitle>
              <CardDescription>
                Compare suas transações com os extratos das adquirentes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Total Transações</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-sm text-green-600">Conciliadas</p>
              <p className="text-xl font-bold text-green-600">{stats.reconciled}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <p className="text-sm text-yellow-600">Incompletas</p>
              <p className="text-xl font-bold text-yellow-600">{stats.incomplete}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Valor Bruto</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Taxas</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(stats.totalFees)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por NSU, cliente..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={acquirerFilter} onValueChange={setAcquirerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Adquirente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Adquirentes</SelectItem>
            {acquirers?.map(acq => (
              <SelectItem key={acq.id} value={acq.id}>{acq.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Transação</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>NSU/CV</TableHead>
                  <TableHead>Adquirente</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstallments.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{item.sale?.lead?.name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          Parcela {item.installment_number}/{item.total_installments}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.transaction_date 
                        ? format(parseISO(item.transaction_date), 'dd/MM/yyyy HH:mm')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(item.amount_cents)}
                    </TableCell>
                    <TableCell className="text-destructive">
                      {item.fee_cents ? formatCurrency(item.fee_cents) : '-'}
                      {item.fee_percentage && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.fee_percentage}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.net_amount_cents || item.amount_cents)}
                    </TableCell>
                    <TableCell>
                      {item.card_brand ? (
                        <Badge variant="outline">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {CARD_BRANDS[item.card_brand] || item.card_brand}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.transaction_type 
                        ? TRANSACTION_TYPES[item.transaction_type] || item.transaction_type
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.nsu_cv || '-'}
                    </TableCell>
                    <TableCell>
                      {item.acquirer_name || '-'}
                    </TableCell>
                    <TableCell>
                      <ReconciliationStatus item={item} />
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredInstallments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {installments?.length === 0 
                        ? 'Nenhuma transação de cartão encontrada. As vendas com máquina de cartão aparecerão aqui após confirmação.'
                        : 'Nenhuma transação corresponde aos filtros selecionados.'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
