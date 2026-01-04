import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, ZoomIn } from 'lucide-react';

interface ProductLabelViewerProps {
  labelImageUrl: string | null;
  productName: string;
}

export function ProductLabelViewer({ labelImageUrl, productName }: ProductLabelViewerProps) {
  const [open, setOpen] = useState(false);

  if (!labelImageUrl) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Ver Rótulo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rótulo - {productName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <img
              src={labelImageUrl}
              alt={`Rótulo de ${productName}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
