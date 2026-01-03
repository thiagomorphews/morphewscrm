import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFinancialByBank, type GroupedByBank } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';
import { Loader2, Landmark, CreditCard, Building } from 'lucide-react';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCnpj(cnpj: string): string {
  if (!cnpj || cnpj === 'Sem CNPJ') return cnpj;
  // Format as XX.XXX.XXX/XXXX-XX
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

interface BankCardProps {
  data: GroupedByBank;
}

function BankCard({ data }: BankCardProps) {
  const percentConfirmed = data.totalBruto > 0 
    ? Math.round((data.confirmado / data.totalBruto) * 100) 
    : 0;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Landmark className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">{data.bankName}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Building className="h-3 w-3" />
                {formatCnpj(data.cnpj)}
              </CardDescription>
            </div>
          </div>
          
          <Badge variant="outline" className="ml-2">
            {data.count} {data.count === 1 ? 'parcela' : 'parcelas'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Main Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Bruto</p>
              <p className="text-xl font-bold">{formatCurrency(data.totalBruto)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Líquido</p>
              <p className="text-xl font-bold">{formatCurrency(data.totalLiquido)}</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso de Recebimento</span>
              <span className="font-medium">{percentConfirmed}%</span>
            </div>
            <Progress value={percentConfirmed} className="h-2" />
          </div>
          
          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-green-500/10">
              <p className="text-xs text-green-600">Recebido</p>
              <p className="font-bold text-green-600">{formatCurrency(data.confirmado)}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <p className="text-xs text-yellow-600">Pendente</p>
              <p className="font-bold text-yellow-600">{formatCurrency(data.pendente)}</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10">
              <p className="text-xs text-destructive">Atrasado</p>
              <p className="font-bold text-destructive">{formatCurrency(data.atrasado)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BankAccountsTab() {
  const { data: groupedData, isLoading } = useFinancialByBank();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!groupedData || groupedData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum dado encontrado. Configure destinos bancários e CNPJs nas formas de pagamento.
      </div>
    );
  }
  
  // Calculate totals
  const totals = groupedData.reduce(
    (acc, item) => ({
      bruto: acc.bruto + item.totalBruto,
      liquido: acc.liquido + item.totalLiquido,
      confirmado: acc.confirmado + item.confirmado,
      pendente: acc.pendente + item.pendente,
      atrasado: acc.atrasado + item.atrasado,
    }),
    { bruto: 0, liquido: 0, confirmado: 0, pendente: 0, atrasado: 0 }
  );
  
  return (
    <div className="space-y-6">
      {/* Totals Summary */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <CreditCard className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Resumo por Destino Bancário</CardTitle>
              <CardDescription>
                {groupedData.length} {groupedData.length === 1 ? 'destino' : 'destinos'} • Visão consolidada por banco e CNPJ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Total Bruto</p>
              <p className="text-xl font-bold">{formatCurrency(totals.bruto)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Total Líquido</p>
              <p className="text-xl font-bold">{formatCurrency(totals.liquido)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-sm text-green-600">Já em Conta</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totals.confirmado)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <p className="text-sm text-yellow-600">A Receber</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(totals.pendente)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-sm text-destructive">Em Atraso</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totals.atrasado)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bank Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groupedData.map(item => (
          <BankCard key={`${item.bankId}|${item.cnpjId}`} data={item} />
        ))}
      </div>
    </div>
  );
}
