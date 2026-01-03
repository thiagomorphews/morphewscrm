import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCashFlow, type CashFlowDay } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isToday, isWeekend, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface DayCardProps {
  day: CashFlowDay;
  isHighlighted?: boolean;
}

function DayCard({ day, isHighlighted }: DayCardProps) {
  const date = parseISO(day.date);
  const isTodayDate = isToday(date);
  const isWeekendDay = isWeekend(date);
  const hasData = day.expected > 0 || day.received > 0;
  
  return (
    <div 
      className={cn(
        'p-3 rounded-lg border transition-all',
        isTodayDate && 'ring-2 ring-primary border-primary',
        isWeekendDay && 'bg-muted/30',
        isHighlighted && 'shadow-md',
        !hasData && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={cn(
            'font-medium text-sm',
            isTodayDate && 'text-primary'
          )}>
            {format(date, 'EEE', { locale: ptBR })}
          </p>
          <p className="text-lg font-bold">
            {format(date, 'dd/MM')}
          </p>
        </div>
        {isTodayDate && (
          <Badge className="bg-primary">Hoje</Badge>
        )}
        {day.count > 0 && !isTodayDate && (
          <Badge variant="outline" className="text-xs">
            {day.count}
          </Badge>
        )}
      </div>
      
      {hasData ? (
        <div className="space-y-1">
          {day.expected > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-600">Previsto</span>
              <span className="font-medium text-yellow-600">
                {formatCurrency(day.expected)}
              </span>
            </div>
          )}
          {day.received > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">Recebido</span>
              <span className="font-medium text-green-600">
                {formatCurrency(day.received)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem movimentação</p>
      )}
    </div>
  );
}

export function CashFlowTab() {
  const [daysToShow, setDaysToShow] = useState(14);
  const { data: cashFlow, isLoading } = useCashFlow(30);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!cashFlow || cashFlow.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum dado de fluxo de caixa disponível.
      </div>
    );
  }
  
  const displayDays = cashFlow.slice(0, daysToShow);
  
  // Calculate totals
  const totals = displayDays.reduce(
    (acc, day) => ({
      expected: acc.expected + day.expected,
      received: acc.received + day.received,
      count: acc.count + day.count,
    }),
    { expected: 0, received: 0, count: 0 }
  );
  
  // Weekly aggregation
  const weeks: { label: string; days: CashFlowDay[]; expected: number; received: number }[] = [];
  let currentWeek: CashFlowDay[] = [];
  
  cashFlow.forEach((day, index) => {
    currentWeek.push(day);
    
    if (currentWeek.length === 7 || index === cashFlow.length - 1) {
      const weekStart = parseISO(currentWeek[0].date);
      const weekEnd = parseISO(currentWeek[currentWeek.length - 1].date);
      
      weeks.push({
        label: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
        days: [...currentWeek],
        expected: currentWeek.reduce((sum, d) => sum + d.expected, 0),
        received: currentWeek.reduce((sum, d) => sum + d.received, 0),
      });
      
      currentWeek = [];
    }
  });
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Fluxo de Caixa Previsto</CardTitle>
              <CardDescription>
                Próximos {daysToShow} dias • {totals.count} parcelas previstas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Total Previsto</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.expected)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Já Recebido</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.received)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground">Total Esperado</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.expected + totals.received)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumo Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeks.slice(0, 4).map((week, index) => (
              <div 
                key={week.label}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  index === 0 && 'bg-primary/5 border-primary/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'outline'}>
                    Semana {index + 1}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{week.label}</span>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Previsto</p>
                    <p className="font-medium text-yellow-600">{formatCurrency(week.expected)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Recebido</p>
                    <p className="font-medium text-green-600">{formatCurrency(week.received)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Daily Calendar View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Calendário Diário</CardTitle>
            <CardDescription>Clique em um dia para ver detalhes</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToShow(Math.max(7, daysToShow - 7))}
              disabled={daysToShow <= 7}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToShow(Math.min(30, daysToShow + 7))}
              disabled={daysToShow >= 30}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-7">
            {displayDays.map(day => (
              <DayCard key={day.date} day={day} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
