import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  type FinancialInstallment, 
  useAcquirers 
} from '@/hooks/useFinancialData';
import { useMyPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  CreditCard, 
  Receipt,
  History,
  User,
  Phone,
  MapPin
} from 'lucide-react';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'master', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'banricompras', label: 'Banricompras' },
];

const TRANSACTION_TYPES = [
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito à Vista' },
  { value: 'credit_installment', label: 'Crédito Parcelado' },
];

// =====================================================
// CONFIRM PAYMENT DIALOG
// =====================================================

interface ConfirmPaymentDialogProps {
  installment: FinancialInstallment | null;
  open: boolean;
  onClose: () => void;
}

export function ConfirmPaymentDialog({ installment, open, onClose }: ConfirmPaymentDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: acquirers } = useAcquirers();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Card-specific fields
  const isCardPayment = installment?.sale?.payment_method?.category === 'card_machine';
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [cardBrand, setCardBrand] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [nsuCv, setNsuCv] = useState('');
  const [acquirerId, setAcquirerId] = useState('');
  
  const handleConfirm = async () => {
    if (!installment || !profile?.organization_id) return;
    
    setIsLoading(true);
    
    try {
      // Get current status for history
      const { data: current } = await supabase
        .from('sale_installments')
        .select('status')
        .eq('id', installment.id)
        .single();
      
      // Build update data
      const updateData: Record<string, unknown> = {
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user?.id,
        notes: notes || null,
      };
      
      // Add card-specific data if applicable
      if (isCardPayment) {
        updateData.transaction_date = transactionDate || null;
        updateData.card_brand = cardBrand || null;
        updateData.transaction_type = transactionType || null;
        updateData.nsu_cv = nsuCv || null;
        updateData.acquirer_id = acquirerId || null;
      }
      
      // Update installment
      const { error } = await supabase
        .from('sale_installments')
        .update(updateData)
        .eq('id', installment.id);
      
      if (error) throw error;
      
      // Log history
      await supabase.from('installment_history').insert({
        installment_id: installment.id,
        organization_id: profile.organization_id,
        previous_status: current?.status,
        new_status: 'confirmed',
        changed_by: user?.id,
        notes: notes || 'Pagamento confirmado',
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['financial-installments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary-complete'] });
      queryClient.invalidateQueries({ queryKey: ['financial-by-cost-center'] });
      queryClient.invalidateQueries({ queryKey: ['financial-by-bank'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      
      toast.success('Pagamento confirmado com sucesso!');
      onClose();
      
      // Reset form
      setNotes('');
      setTransactionDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setCardBrand('');
      setTransactionType('');
      setNsuCv('');
      setAcquirerId('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao confirmar pagamento';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!installment) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
          <DialogDescription>
            Confirme o recebimento desta parcela
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-2 pr-4">
            {/* Installment Info */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{installment.sale?.lead?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcela:</span>
                <span>{installment.installment_number}/{installment.total_installments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-lg">{formatCurrency(installment.amount_cents)}</span>
              </div>
              {installment.net_amount_cents && installment.net_amount_cents !== installment.amount_cents && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Líquido:</span>
                  <span>{formatCurrency(installment.net_amount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimento:</span>
                <span>{format(parseISO(installment.due_date), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma:</span>
                <span>{installment.sale?.payment_method?.name}</span>
              </div>
            </div>
            
            {/* Card-specific fields */}
            {isCardPayment && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Dados da Transação
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>Data e Hora da Transação</Label>
                    <Input
                      type="datetime-local"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Bandeira do Cartão</Label>
                    <Select value={cardBrand} onValueChange={setCardBrand}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_BRANDS.map(b => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Transação</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>NSU/CV</Label>
                    <Input
                      placeholder="Número da transação..."
                      value={nsuCv}
                      onChange={(e) => setNsuCv(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Adquirente</Label>
                    <Select value={acquirerId} onValueChange={setAcquirerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {acquirers?.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea 
                placeholder="Ex: Pagamento via PIX, comprovante recebido..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Recebimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// INSTALLMENT DETAIL DIALOG
// =====================================================

interface InstallmentDetailDialogProps {
  installment: FinancialInstallment | null;
  open: boolean;
  onClose: () => void;
}

export function InstallmentDetailDialog({ installment, open, onClose }: InstallmentDetailDialogProps) {
  if (!installment) return null;
  
  const isOverdue = installment.status === 'pending' && 
    isBefore(parseISO(installment.due_date), startOfDay(new Date()));
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes da Parcela
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 py-2 pr-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              {installment.status === 'confirmed' ? (
                <Badge className="bg-green-500">Recebido</Badge>
              ) : isOverdue ? (
                <Badge variant="destructive">Atrasado</Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pendente</Badge>
              )}
            </div>
            
            <Separator />
            
            {/* Client Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </h4>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p className="font-medium">{installment.sale?.lead?.name}</p>
                {installment.sale?.lead?.whatsapp && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {installment.sale.lead.whatsapp}
                  </p>
                )}
                {(installment.sale?.lead?.city || installment.sale?.lead?.state) && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[installment.sale?.lead?.city, installment.sale?.lead?.state].filter(Boolean).join(' - ')}
                  </p>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Financial Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Valores
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor Bruto</p>
                  <p className="text-lg font-bold">{formatCurrency(installment.amount_cents)}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor Líquido</p>
                  <p className="text-lg font-bold">{formatCurrency(installment.net_amount_cents || installment.amount_cents)}</p>
                </div>
                {installment.fee_cents && installment.fee_cents > 0 && (
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <p className="text-xs text-destructive">Taxa</p>
                    <p className="text-lg font-bold text-destructive">
                      {formatCurrency(installment.fee_cents)}
                      {installment.fee_percentage && (
                        <span className="text-xs ml-1">({installment.fee_percentage}%)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Dates */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datas
              </h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcela:</span>
                  <span>{installment.installment_number} de {installment.total_installments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span>{format(parseISO(installment.due_date), 'dd/MM/yyyy')}</span>
                </div>
                {installment.confirmed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmado em:</span>
                    <span>{format(parseISO(installment.confirmed_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                )}
                {installment.transaction_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transação:</span>
                    <span>{format(parseISO(installment.transaction_date), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Payment Method Info */}
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Forma de Pagamento
              </h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método:</span>
                  <span>{installment.sale?.payment_method?.name}</span>
                </div>
                {installment.cost_center_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Centro de Custo:</span>
                    <span>{installment.cost_center_name}</span>
                  </div>
                )}
                {installment.bank_destination_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banco:</span>
                    <span>{installment.bank_destination_name}</span>
                  </div>
                )}
                {installment.cnpj_destination && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CNPJ:</span>
                    <span>{installment.cnpj_destination}</span>
                  </div>
                )}
                {installment.card_brand && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bandeira:</span>
                    <Badge variant="outline">{installment.card_brand}</Badge>
                  </div>
                )}
                {installment.transaction_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{installment.transaction_type}</span>
                  </div>
                )}
                {installment.nsu_cv && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NSU/CV:</span>
                    <span className="font-mono">{installment.nsu_cv}</span>
                  </div>
                )}
                {installment.acquirer_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adquirente:</span>
                    <span>{installment.acquirer_name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Notes */}
            {installment.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Observações</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {installment.notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
