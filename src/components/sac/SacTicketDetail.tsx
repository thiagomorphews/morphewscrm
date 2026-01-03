import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  AlertCircle, MessageCircle, RefreshCw, DollarSign, 
  Clock, User, ShoppingCart, ExternalLink, Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SacTicket, 
  SAC_CATEGORIES, 
  SAC_STATUS_LABELS, 
  SAC_PRIORITY_LABELS,
  SacTicketStatus,
  useSacTicketComments,
  useUpdateSacTicketStatus,
  useAddSacTicketComment,
} from '@/hooks/useSacTickets';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_ICONS = {
  complaint: AlertCircle,
  question: MessageCircle,
  request: RefreshCw,
  financial: DollarSign,
};

interface SacTicketDetailProps {
  ticket: SacTicket;
  onClose?: () => void;
  onViewLead?: () => void;
}

export function SacTicketDetail({ ticket, onClose, onViewLead }: SacTicketDetailProps) {
  const { data: comments = [], isLoading: commentsLoading } = useSacTicketComments(ticket.id);
  const updateStatus = useUpdateSacTicketStatus();
  const addComment = useAddSacTicketComment();
  
  const [newComment, setNewComment] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolution, setShowResolution] = useState(false);
  
  const CategoryIcon = CATEGORY_ICONS[ticket.category];
  
  const handleStatusChange = (newStatus: SacTicketStatus) => {
    if (newStatus === 'resolved') {
      setShowResolution(true);
    } else {
      updateStatus.mutate({ ticketId: ticket.id, status: newStatus });
    }
  };
  
  const handleResolve = () => {
    updateStatus.mutate({ 
      ticketId: ticket.id, 
      status: 'resolved',
      resolution_notes: resolutionNotes 
    }, {
      onSuccess: () => {
        setShowResolution(false);
        setResolutionNotes('');
      }
    });
  };
  
  const handleSendComment = () => {
    if (!newComment.trim()) return;
    
    addComment.mutate({
      ticketId: ticket.id,
      content: newComment,
    }, {
      onSuccess: () => setNewComment(''),
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              ticket.category === 'complaint' && "bg-red-100 text-red-600",
              ticket.category === 'question' && "bg-blue-100 text-blue-600",
              ticket.category === 'request' && "bg-purple-100 text-purple-600",
              ticket.category === 'financial' && "bg-green-100 text-green-600",
            )}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {SAC_CATEGORIES[ticket.category].label}
              </h2>
              <p className="text-muted-foreground">{ticket.subcategory}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                ticket.priority === 'high' && "border-red-500 text-red-500",
                ticket.priority === 'normal' && "border-blue-500 text-blue-500",
                ticket.priority === 'low' && "border-gray-500 text-gray-500"
              )}
            >
              {SAC_PRIORITY_LABELS[ticket.priority].label}
            </Badge>
            <Badge className={SAC_STATUS_LABELS[ticket.status].color}>
              {SAC_STATUS_LABELS[ticket.status].label}
            </Badge>
          </div>
        </div>
        
        {/* Status Change */}
        {ticket.status !== 'closed' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Alterar status:</span>
            <Select 
              value={ticket.status} 
              onValueChange={(v) => handleStatusChange(v as SacTicketStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Resolution Form */}
        {showResolution && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="font-medium">Resolução do chamado</p>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Descreva como o problema foi resolvido..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleResolve} disabled={updateStatus.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Resolução
              </Button>
              <Button variant="ghost" onClick={() => setShowResolution(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Lead */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Lead / Cliente</p>
          <Button 
            variant="link" 
            className="p-0 h-auto font-medium"
            onClick={onViewLead}
          >
            <User className="h-4 w-4 mr-2" />
            {ticket.lead?.name || 'Lead não encontrado'}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {/* Sale */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Venda vinculada</p>
          {ticket.sale ? (
            <div className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span>R$ {(ticket.sale.total_cents / 100).toFixed(2)}</span>
              <span className="text-muted-foreground">
                ({format(new Date(ticket.sale.created_at), 'dd/MM/yyyy')})
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma</p>
          )}
        </div>
        
        {/* Created by */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Aberto por</p>
          <p className="text-sm font-medium">
            {ticket.creator ? `${ticket.creator.first_name} ${ticket.creator.last_name}` : 'Desconhecido'}
          </p>
        </div>
        
        {/* Created at */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Data de abertura</p>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>
        
        {/* Involved users */}
        {ticket.involved_users && ticket.involved_users.length > 0 && (
          <div className="col-span-2 space-y-1">
            <p className="text-sm text-muted-foreground">Usuários envolvidos</p>
            <div className="flex flex-wrap gap-2">
              {ticket.involved_users.map(u => (
                <Badge key={u.user_id} variant="secondary">
                  {u.profile ? `${u.profile.first_name} ${u.profile.last_name}` : 'Usuário'}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Description */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Descrição do problema</p>
        <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>
      
      {/* Resolution Notes */}
      {ticket.resolution_notes && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-600">Resolução</p>
          <p className="text-sm bg-green-50 border border-green-200 p-3 rounded-lg whitespace-pre-wrap">
            {ticket.resolution_notes}
          </p>
        </div>
      )}
      
      <Separator />
      
      {/* Comments */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Comentários e histórico</p>
        
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {comment.user?.first_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'Usuário'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                  <p className="text-sm bg-muted/50 p-2 rounded-lg">{comment.content}</p>
                </div>
              </div>
            ))}
            
            {comments.length === 0 && !commentsLoading && (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nenhum comentário ainda
              </p>
            )}
          </div>
        </ScrollArea>
        
        {/* Add Comment */}
        {ticket.status !== 'closed' && (
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicionar comentário..."
              className="min-h-[60px]"
            />
            <Button 
              onClick={handleSendComment}
              disabled={!newComment.trim() || addComment.isPending}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
