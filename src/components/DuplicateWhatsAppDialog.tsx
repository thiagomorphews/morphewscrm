import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserRound, ArrowRight } from 'lucide-react';

interface DuplicateLeadInfo {
  id: string;
  name: string;
  whatsapp: string;
}

interface DuplicateWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateLead: DuplicateLeadInfo | null;
}

export function DuplicateWhatsAppDialog({
  open,
  onOpenChange,
  duplicateLead,
}: DuplicateWhatsAppDialogProps) {
  const navigate = useNavigate();

  if (!duplicateLead) return null;

  const formatPhone = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const handleGoToLead = () => {
    onOpenChange(false);
    navigate(`/leads/${duplicateLead.id}`);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-amber-500" />
            WhatsApp já cadastrado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              O número <strong>{formatPhone(duplicateLead.whatsapp)}</strong> já está vinculado ao cliente:
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-semibold text-foreground">{duplicateLead.name}</p>
            </div>
            <p>
              Deseja ir para o cadastro desse cliente?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToLead} className="gap-2">
            Ir para o cliente
            <ArrowRight className="w-4 h-4" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
