import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  Check, 
  Plus, 
  User,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLeadFollowups, useCreateFollowup, useCompleteFollowup } from '@/hooks/useLeadFollowups';
import { toast } from '@/hooks/use-toast';

interface LeadFollowupsSectionProps {
  leadId: string;
}

export function LeadFollowupsSection({ leadId }: LeadFollowupsSectionProps) {
  const { data: followups = [], isLoading } = useLeadFollowups(leadId);
  const createFollowup = useCreateFollowup();
  const completeFollowup = useCompleteFollowup();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    date: '',
    time: '',
    reason: '',
    notes: '',
  });

  const pendingFollowups = followups.filter(f => !f.completed_at);
  const completedFollowups = followups.filter(f => f.completed_at);

  const handleCreate = async () => {
    if (!newFollowup.date || !newFollowup.time) {
      toast({ title: 'Preencha data e hora', variant: 'destructive' });
      return;
    }

    const scheduledAt = new Date(`${newFollowup.date}T${newFollowup.time}`);
    
    await createFollowup.mutateAsync({
      lead_id: leadId,
      scheduled_at: scheduledAt,
      reason: newFollowup.reason || undefined,
      notes: newFollowup.notes || undefined,
    });

    setIsDialogOpen(false);
    setNewFollowup({ date: '', time: '', reason: '', notes: '' });
    toast({ title: 'Follow-up agendado!' });
  };

  const handleComplete = async (id: string) => {
    await completeFollowup.mutateAsync({ id });
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'receptive': return 'Receptivo';
      case 'sale_lost': return 'Venda perdida';
      default: return 'Manual';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Follow-ups
            {pendingFollowups.length > 0 && (
              <Badge variant="secondary">{pendingFollowups.length} pendente(s)</Badge>
            )}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Agendar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Follow-up</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newFollowup.date}
                      onChange={(e) => setNewFollowup(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={newFollowup.time}
                      onChange={(e) => setNewFollowup(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input
                    placeholder="Ex: Retornar sobre proposta"
                    value={newFollowup.reason}
                    onChange={(e) => setNewFollowup(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Anotações adicionais..."
                    value={newFollowup.notes}
                    onChange={(e) => setNewFollowup(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={createFollowup.isPending}
                  className="w-full"
                >
                  Agendar Follow-up
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {followups.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum follow-up agendado
          </p>
        ) : (
          <>
            {/* Pending followups */}
            {pendingFollowups.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Pendentes</h4>
                {pendingFollowups.map((followup) => {
                  const scheduledDate = new Date(followup.scheduled_at);
                  const isOverdue = scheduledDate < new Date();
                  
                  return (
                    <div 
                      key={followup.id} 
                      className={`p-3 rounded-lg border ${isOverdue ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-muted/50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                              {format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                            )}
                          </div>
                          {followup.reason && (
                            <p className="text-sm text-foreground">{followup.reason}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{followup.user_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(followup.source_type)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleComplete(followup.id)}
                          disabled={completeFollowup.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed followups */}
            {completedFollowups.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Concluídos</h4>
                {completedFollowups.slice(0, 5).map((followup) => (
                  <div key={followup.id} className="p-3 rounded-lg bg-muted/30 opacity-60">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm line-through">
                        {format(new Date(followup.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {followup.reason && (
                      <p className="text-sm text-muted-foreground">{followup.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
