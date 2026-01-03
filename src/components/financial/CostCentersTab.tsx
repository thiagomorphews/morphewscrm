import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFinancialByCostCenter, type GroupedByCostCenter } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, ChevronRight, Building2, TrendingUp } from 'lucide-react';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface CostCenterCardProps {
  data: GroupedByCostCenter;
}

function CostCenterCard({ data }: CostCenterCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const percentConfirmed = data.totalBruto > 0 
    ? Math.round((data.confirmado / data.totalBruto) * 100) 
    : 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {data.costCenterName}
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                  <CardDescription>
                    {data.count} {data.count === 1 ? 'parcela' : 'parcelas'} • {data.byCategory.length} {data.byCategory.length === 1 ? 'categoria' : 'categorias'}
                  </CardDescription>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(data.totalBruto)}</p>
                <p className="text-sm text-muted-foreground">
                  Líquido: {formatCurrency(data.totalLiquido)}
                </p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recebido</span>
                <span className="font-medium">{percentConfirmed}%</span>
              </div>
              <Progress value={percentConfirmed} className="h-2" />
              
              <div className="flex gap-4 text-sm pt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Recebido:</span>
                  <span className="font-medium">{formatCurrency(data.confirmado)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Pendente:</span>
                  <span className="font-medium">{formatCurrency(data.pendente)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Atrasado:</span>
                  <span className="font-medium">{formatCurrency(data.atrasado)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Por Categoria</h4>
              
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.byCategory.map(cat => (
                  <div 
                    key={cat.category} 
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{cat.categoryLabel}</Badge>
                      <span className="text-xs text-muted-foreground">{cat.count} parcelas</span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bruto:</span>
                        <span className="font-medium">{formatCurrency(cat.totalBruto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Líquido:</span>
                        <span>{formatCurrency(cat.totalLiquido)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxas:</span>
                        <span className="text-destructive">{formatCurrency(cat.totalTaxas)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-2 text-xs">
                      <span className="text-green-600">{formatCurrency(cat.confirmado)} rec.</span>
                      <span className="text-yellow-600">{formatCurrency(cat.pendente)} pend.</span>
                      {cat.atrasado > 0 && (
                        <span className="text-destructive">{formatCurrency(cat.atrasado)} atr.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function CostCentersTab() {
  const { data: groupedData, isLoading } = useFinancialByCostCenter();
  
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
        Nenhum dado encontrado. Registre vendas com formas de pagamento que tenham centros de custo configurados.
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
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Resumo Geral por Centro de Custo</CardTitle>
              <CardDescription>
                {groupedData.length} {groupedData.length === 1 ? 'centro de custo' : 'centros de custo'}
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
              <p className="text-sm text-green-600">Recebido</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totals.confirmado)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <p className="text-sm text-yellow-600">Pendente</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(totals.pendente)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-sm text-destructive">Atrasado</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totals.atrasado)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cost Center Cards */}
      <div className="space-y-4">
        {groupedData.map(item => (
          <CostCenterCard key={item.costCenterId || 'none'} data={item} />
        ))}
      </div>
    </div>
  );
}
