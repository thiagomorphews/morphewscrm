import { useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, Banknote, Calendar, Building2, Percent, Clock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  PaymentMethod,
  PaymentTiming,
  PAYMENT_TIMING_LABELS,
  CreatePaymentMethodInput,
} from '@/hooks/usePaymentMethods';

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

export function PaymentMethodsManager() {
  const { data: paymentMethods, isLoading } = usePaymentMethods();
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePaymentMethodInput>({
    name: '',
    payment_timing: 'cash',
    max_installments: 1,
    min_installment_value_cents: 0,
    destination_bank: '',
    destination_cnpj: '',
    fee_percentage: 0,
    settlement_days: 0,
    requires_proof: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      payment_timing: 'cash',
      max_installments: 1,
      min_installment_value_cents: 0,
      destination_bank: '',
      destination_cnpj: '',
      fee_percentage: 0,
      settlement_days: 0,
      requires_proof: false,
    });
    setEditingMethod(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      payment_timing: method.payment_timing,
      max_installments: method.max_installments,
      min_installment_value_cents: method.min_installment_value_cents,
      destination_bank: method.destination_bank || '',
      destination_cnpj: method.destination_cnpj || '',
      fee_percentage: method.fee_percentage,
      settlement_days: method.settlement_days,
      requires_proof: method.requires_proof,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMethod) {
      await updateMutation.mutateAsync({ id: editingMethod.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    
    setIsFormOpen(false);
    resetForm();
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    await updateMutation.mutateAsync({ 
      id: method.id, 
      is_active: !method.is_active 
    });
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Formas de Pagamento
              </CardTitle>
              <CardDescription>
                Configure as formas de pagamento disponíveis para vendas
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Forma
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma forma de pagamento cadastrada</p>
              <p className="text-sm">Clique em "Nova Forma" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods?.map((method) => (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    method.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{method.name}</span>
                      <Badge variant={method.is_active ? 'default' : 'secondary'}>
                        {PAYMENT_TIMING_LABELS[method.payment_timing]}
                      </Badge>
                      {method.payment_timing === 'installments' && (
                        <Badge variant="outline">até {method.max_installments}x</Badge>
                      )}
                      {method.requires_proof && (
                        <Badge variant="outline" className="gap-1">
                          <FileCheck className="h-3 w-3" />
                          Comprovante
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {method.destination_bank && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {method.destination_bank}
                        </span>
                      )}
                      {method.fee_percentage > 0 && (
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Taxa: {method.fee_percentage}%
                        </span>
                      )}
                      {method.settlement_days > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {method.settlement_days} dias
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => handleToggleActive(method)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(method)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(method.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsFormOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da forma de pagamento
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cartão de Crédito"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_timing">Tipo de Pagamento *</Label>
              <Select
                value={formData.payment_timing}
                onValueChange={(value: PaymentTiming) => setFormData({ ...formData, payment_timing: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      À Vista
                    </div>
                  </SelectItem>
                  <SelectItem value="term">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      A Prazo
                    </div>
                  </SelectItem>
                  <SelectItem value="installments">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Parcelado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payment_timing === 'installments' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_installments">Máximo de Parcelas</Label>
                  <Select
                    value={String(formData.max_installments)}
                    onValueChange={(value) => setFormData({ ...formData, max_installments: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_installment_value">Valor Mínimo Parcela (R$)</Label>
                  <Input
                    id="min_installment_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData.min_installment_value_cents || 0) / 100}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      min_installment_value_cents: Math.round(Number(e.target.value) * 100) 
                    })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination_bank">Banco Destino</Label>
                <Input
                  id="destination_bank"
                  value={formData.destination_bank || ''}
                  onChange={(e) => setFormData({ ...formData, destination_bank: e.target.value })}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_cnpj">CNPJ Destino</Label>
                <Input
                  id="destination_cnpj"
                  value={formData.destination_cnpj || ''}
                  onChange={(e) => setFormData({ ...formData, destination_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee_percentage">Taxa (%)</Label>
                <Input
                  id="fee_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.fee_percentage || 0}
                  onChange={(e) => setFormData({ ...formData, fee_percentage: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement_days">Dias p/ Compensação</Label>
                <Input
                  id="settlement_days"
                  type="number"
                  min="0"
                  value={formData.settlement_days || 0}
                  onChange={(e) => setFormData({ ...formData, settlement_days: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="requires_proof"
                checked={formData.requires_proof}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_proof: checked })}
              />
              <Label htmlFor="requires_proof" className="cursor-pointer">
                Exige comprovante de pagamento
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingMethod ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir forma de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A forma de pagamento será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
