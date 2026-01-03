import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useFinancialInstallments, 
  useCostCenters,
  type FinancialInstallment,
  type InstallmentFilters 
} from '@/hooks/useFinancialData';
import { useMyPermissions } from '@/hooks/useUserPermissions';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Calendar, 
  Eye, 
  CheckCircle2,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';

// =====================================================
// HELPERS
// =====================================================

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStatusBadge(status: string, dueDate?: string) {
  const today = startOfDay(new Date());
  const isOverdue = status === 'pending' && dueDate && isBefore(parseISO(dueDate), today);
  
  if (isOverdue || status === 'overdue') {
    return <Badge variant="destructive">Atrasado</Badge>;
  }
  
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pendente</Badge>;
    case 'confirmed':
      return <Badge className="bg-green-500 hover:bg-green-600">Recebido</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card_machine: 'Máquina de Cartão',
  bank_slip: 'Boleto',
  bank_transfer: 'Transferência',
  other: 'Outro',
};

// =====================================================
// KANBAN VIEW
// =====================================================

interface KanbanColumnProps {
  title: string;
  items: FinancialInstallment[];
  color: string;
  onView: (item: FinancialInstallment) => void;
  onConfirm: (item: FinancialInstallment) => void;
  canConfirmPayment: boolean;
}

function KanbanColumn({ title, items, color, onView, onConfirm, canConfirmPayment }: KanbanColumnProps) {
  const total = items.reduce((sum, item) => sum + item.amount_cents, 0);
  
  return (
    <div className="flex-1 min-w-[300px] max-w-[400px]">
      <div className={cn('rounded-t-lg px-4 py-3 font-medium text-white', color)}>
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {items.length}
          </Badge>
        </div>
        <div className="text-sm opacity-90 mt-1">{formatCurrency(total)}</div>
      </div>
      
      <ScrollArea className="h-[500px] border border-t-0 rounded-b-lg bg-muted/30 p-2">
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.sale?.lead?.name || 'Cliente'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Parcela {item.installment_number}/{item.total_installments}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(item.amount_cents)}</p>
                    {item.net_amount_cents && item.net_amount_cents !== item.amount_cents && (
                      <p className="text-xs text-muted-foreground">
                        Líq: {formatCurrency(item.net_amount_cents)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(item.due_date), 'dd/MM/yy')}
                  </span>
                  <span>{item.sale?.payment_method?.name || '-'}</span>
                </div>
                
                {item.cost_center_name && (
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.cost_center_name}
                    </Badge>
                  </div>
                )}
                
                <div className="flex gap-1 mt-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1 h-7 text-xs"
                    onClick={() => onView(item)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  {item.status === 'pending' && canConfirmPayment && (
                    <Button 
                      size="sm" 
                      className="flex-1 h-7 text-xs bg-green-500 hover:bg-green-600"
                      onClick={() => onConfirm(item)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Nenhuma parcela
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function KanbanView({ 
  installments, 
  onView, 
  onConfirm,
  canConfirmPayment
}: { 
  installments: FinancialInstallment[]; 
  onView: (item: FinancialInstallment) => void;
  onConfirm: (item: FinancialInstallment) => void;
  canConfirmPayment: boolean;
}) {
  const today = startOfDay(new Date());
  
  const pending = installments.filter(i => 
    i.status === 'pending' && !isBefore(parseISO(i.due_date), today)
  );
  const overdue = installments.filter(i => 
    (i.status === 'pending' && isBefore(parseISO(i.due_date), today)) ||
    i.status === 'overdue'
  );
  const confirmed = installments.filter(i => i.status === 'confirmed');
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <KanbanColumn 
        title="Pendentes" 
        items={pending} 
        color="bg-yellow-500" 
        onView={onView}
        onConfirm={onConfirm}
        canConfirmPayment={canConfirmPayment}
      />
      <KanbanColumn 
        title="Em Atraso" 
        items={overdue} 
        color="bg-destructive" 
        onView={onView}
        onConfirm={onConfirm}
        canConfirmPayment={canConfirmPayment}
      />
      <KanbanColumn 
        title="Recebidos" 
        items={confirmed} 
        color="bg-green-500" 
        onView={onView}
        onConfirm={onConfirm}
        canConfirmPayment={canConfirmPayment}
      />
    </div>
  );
}

// =====================================================
// LIST VIEW
// =====================================================

function ListView({ 
  installments, 
  onView, 
  onConfirm,
  canConfirmPayment
}: { 
  installments: FinancialInstallment[]; 
  onView: (item: FinancialInstallment) => void;
  onConfirm: (item: FinancialInstallment) => void;
  canConfirmPayment: boolean;
}) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Parcela</TableHead>
            <TableHead>Valor Bruto</TableHead>
            <TableHead>Valor Líquido</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Centro Custo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.sale?.lead?.name || 'Cliente'}
              </TableCell>
              <TableCell>
                {item.installment_number}/{item.total_installments}
              </TableCell>
              <TableCell className="font-bold">
                {formatCurrency(item.amount_cents)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatCurrency(item.net_amount_cents || item.amount_cents)}
              </TableCell>
              <TableCell>
                {format(parseISO(item.due_date), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                {item.sale?.payment_method?.name || '-'}
              </TableCell>
              <TableCell>
                {item.cost_center_name || '-'}
              </TableCell>
              <TableCell>
                {getStatusBadge(item.status, item.due_date)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onView(item)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {item.status === 'pending' && canConfirmPayment && (
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => onConfirm(item)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          
          {installments.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhuma parcela encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface ReceivablesTabProps {
  onViewInstallment: (item: FinancialInstallment) => void;
  onConfirmPayment: (item: FinancialInstallment) => void;
}

export function ReceivablesTab({ onViewInstallment, onConfirmPayment }: ReceivablesTabProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filters, setFilters] = useState<InstallmentFilters>({});
  
  const { data: permissions } = useMyPermissions();
  const { data: costCenters } = useCostCenters();
  const { data: installments, isLoading } = useFinancialInstallments(filters);
  
  const canConfirmPayment = permissions?.sales_confirm_payment ?? false;
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, WhatsApp, NSU..."
            className="pl-10"
            value={filters.search || ''}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="confirmed">Recebido</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) => setFilters(f => ({ ...f, category: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={filters.costCenterId || 'all'}
          onValueChange={(v) => setFilters(f => ({ ...f, costCenterId: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Centro de Custo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {costCenters?.map(cc => (
              <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex-1" />
        
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView 
          installments={installments || []} 
          onView={onViewInstallment}
          onConfirm={onConfirmPayment}
          canConfirmPayment={canConfirmPayment}
        />
      ) : (
        <ListView 
          installments={installments || []} 
          onView={onViewInstallment}
          onConfirm={onConfirmPayment}
          canConfirmPayment={canConfirmPayment}
        />
      )}
    </div>
  );
}
