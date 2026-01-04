import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  MessageSquare, 
  ShoppingCart, 
  XCircle,
  User,
  Package,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeadReceptiveHistory } from '@/hooks/useLeadReceptiveHistory';
import { CONVERSATION_MODES } from '@/hooks/useReceptiveModule';

interface LeadReceptiveHistorySectionProps {
  leadId: string;
}

export function LeadReceptiveHistorySection({ leadId }: LeadReceptiveHistorySectionProps) {
  const { data: history = [], isLoading } = useLeadReceptiveHistory(leadId);

  const getModeLabel = (mode: string) => {
    const found = CONVERSATION_MODES.find(m => m.value === mode);
    return found?.label || mode;
  };

  const getModeIcon = (mode: string) => {
    if (mode.includes('call') || mode.includes('ligacao')) return Phone;
    if (mode.includes('whatsapp')) return MessageSquare;
    return MessageSquare;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Histórico Receptivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Histórico Receptivo
          <Badge variant="secondary">{history.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((item) => {
          const ModeIcon = getModeIcon(item.conversation_mode);
          
          return (
            <div 
              key={item.id} 
              className="p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ModeIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {getModeLabel(item.conversation_mode)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {item.sale_id && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Venda realizada
                      </Badge>
                    )}
                    
                    {item.reason_name && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        {item.reason_name}
                      </Badge>
                    )}
                    
                    {item.product_name && (
                      <Badge variant="secondary">
                        <Package className="w-3 h-3 mr-1" />
                        {item.product_name}
                      </Badge>
                    )}
                    
                    {item.purchase_potential_cents && item.purchase_potential_cents > 0 && (
                      <Badge variant="outline" className="text-primary">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Potencial: {formatCurrency(item.purchase_potential_cents)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.user_name}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
