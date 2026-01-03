import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialSummary } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  Receipt
} from 'lucide-react';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  count?: number;
}

function SummaryCard({ title, value, subtitle, icon: Icon, color, bg, count }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {count !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {count} {count === 1 ? 'parcela' : 'parcelas'}
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FinancialDashboard() {
  const { data: summary, isLoading } = useFinancialSummary();
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  const primaryCards = [
    {
      title: 'A Receber (Pendente)',
      value: formatCurrency(summary?.totalPending || 0),
      count: summary?.countPending || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Recebido (Confirmado)',
      value: formatCurrency(summary?.totalConfirmed || 0),
      count: summary?.countConfirmed || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Em Atraso',
      value: formatCurrency(summary?.totalOverdue || 0),
      count: summary?.countOverdue || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Recebido Hoje',
      value: formatCurrency(summary?.todayReceived || 0),
      subtitle: `Esta semana: ${formatCurrency(summary?.weekReceived || 0)}`,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];
  
  const secondaryCards = [
    {
      title: 'Previsto Hoje',
      value: formatCurrency(summary?.todayExpected || 0),
      subtitle: `Esta semana: ${formatCurrency(summary?.weekExpected || 0)}`,
      icon: Calendar,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Previsto Mês',
      value: formatCurrency(summary?.monthExpected || 0),
      subtitle: `Recebido: ${formatCurrency(summary?.monthReceived || 0)}`,
      icon: Wallet,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Líquido Confirmado',
      value: formatCurrency(summary?.totalNetConfirmed || 0),
      subtitle: `Taxas: ${formatCurrency(summary?.totalFees || 0)}`,
      icon: Receipt,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Líquido Esperado',
      value: formatCurrency(summary?.totalNetExpected || 0),
      subtitle: 'Valor após taxas previstas',
      icon: TrendingDown,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {primaryCards.map((card, i) => (
          <SummaryCard key={i} {...card} />
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {secondaryCards.map((card, i) => (
          <SummaryCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
}
