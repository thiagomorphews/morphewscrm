import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FUNNEL_STAGES, FunnelStage } from '@/types/lead';
import { cn } from '@/lib/utils';

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousStage: FunnelStage;
  newStage: FunnelStage;
  onConfirm: (reason: string | null) => void;
  isLoading?: boolean;
}

export function StageChangeDialog({
  open,
  onOpenChange,
  previousStage,
  newStage,
  onConfirm,
  isLoading,
}: StageChangeDialogProps) {
  const [reason, setReason] = useState('');

  const previousStageInfo = FUNNEL_STAGES[previousStage];
  const newStageInfo = FUNNEL_STAGES[newStage];

  const handleConfirm = () => {
    onConfirm(reason.trim() || null);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mudança de Etapa do Funil</DialogTitle>
          <DialogDescription>
            O lead está sendo movido para uma nova etapa. Deseja adicionar uma observação?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Stage change visualization */}
          <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
            <span className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium",
              previousStageInfo.color,
              previousStageInfo.textColor
            )}>
              {previousStageInfo.label}
            </span>
            <span className="text-2xl text-muted-foreground">→</span>
            <span className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium",
              newStageInfo.color,
              newStageInfo.textColor
            )}>
              {newStageInfo.label}
            </span>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo / Observação (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Cliente demonstrou interesse após apresentação do produto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta observação ficará registrada no histórico do lead.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Confirmar Mudança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
