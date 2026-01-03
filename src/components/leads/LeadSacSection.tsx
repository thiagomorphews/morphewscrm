import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Headphones, AlertCircle, MessageCircle, RefreshCw, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSacTickets, SAC_CATEGORIES, SAC_STATUS_LABELS, SAC_PRIORITY_LABELS } from '@/hooks/useSacTickets';
import { SacTicketForm } from '@/components/sac/SacTicketForm';
import { SacTicketDetail } from '@/components/sac/SacTicketDetail';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_ICONS = {
  complaint: AlertCircle,
  question: MessageCircle,
  request: RefreshCw,
  financial: DollarSign,
};

interface LeadSacSectionProps {
  leadId: string;
}

export function LeadSacSection({ leadId }: LeadSacSectionProps) {
  const { data: tickets = [], isLoading } = useSacTickets({ leadId });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            SAC - Chamados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          SAC - Chamados
          {tickets.length > 0 && (
            <Badge variant="secondary">{tickets.length}</Badge>
          )}
        </CardTitle>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Abrir Novo Chamado</DialogTitle>
            </DialogHeader>
            <SacTicketForm 
              preselectedLeadId={leadId}
              onSuccess={() => setIsFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tickets.length === 0 ? (
          <div className="text-center py-6">
            <Headphones className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">
              Nenhum chamado registrado para este lead
            </p>
            <Button variant="outline" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir primeiro chamado
            </Button>
          </div>
        ) : (
          tickets.map(ticket => {
            const CategoryIcon = CATEGORY_ICONS[ticket.category];
            
            return (
              <div
                key={ticket.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  ticket.category === 'complaint' && "bg-red-100 text-red-600",
                  ticket.category === 'question' && "bg-blue-100 text-blue-600",
                  ticket.category === 'request' && "bg-purple-100 text-purple-600",
                  ticket.category === 'financial' && "bg-green-100 text-green-600",
                )}>
                  <CategoryIcon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {ticket.subcategory}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs flex-shrink-0",
                        ticket.priority === 'high' && "border-red-500 text-red-500",
                        ticket.priority === 'normal' && "border-blue-500 text-blue-500",
                        ticket.priority === 'low' && "border-gray-500 text-gray-500"
                      )}
                    >
                      {SAC_PRIORITY_LABELS[ticket.priority].label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        ticket.status === 'open' && "bg-blue-100 text-blue-700",
                        ticket.status === 'in_progress' && "bg-yellow-100 text-yellow-700",
                        ticket.status === 'resolved' && "bg-green-100 text-green-700",
                        ticket.status === 'closed' && "bg-gray-100 text-gray-700",
                      )}
                    >
                      {SAC_STATUS_LABELS[ticket.status].label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(ticket.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })
        )}
        
        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedTicket && (
              <SacTicketDetail 
                ticket={selectedTicket} 
                onClose={() => setSelectedTicketId(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
