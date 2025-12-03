import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface DeleteLeadDialogProps {
  leadName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteLeadDialog({ leadName, onConfirm, isDeleting }: DeleteLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const canDelete = confirmText === 'EXCLUIR';

  const handleConfirm = () => {
    if (canDelete) {
      onConfirm();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full gap-2">
          <Trash2 className="w-4 h-4" />
          Excluir Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Lead
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              Você está prestes a excluir permanentemente o lead{' '}
              <strong className="text-foreground">{leadName}</strong>.
            </p>
            <p>
              Esta ação não pode ser desfeita. Todos os dados associados a este lead serão perdidos.
            </p>
            <p className="font-medium text-foreground">
              Para confirmar, digite <strong className="text-destructive">EXCLUIR</strong> abaixo:
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder="Digite EXCLUIR"
          className="mt-2"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Excluir Permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}