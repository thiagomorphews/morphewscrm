import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (base64: string, mimeType: string) => void;
  isUploading: boolean;
  selectedImage: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageSelect, isUploading, selectedImage, onClear }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onImageSelect(base64, file.type);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="h-9 w-9"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Image className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {selectedImage && (
        <div className="absolute bottom-12 left-0 z-50 bg-card border border-border rounded-lg p-2 shadow-lg">
          <div className="relative">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-[200px] max-h-[200px] rounded object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onClear}
              className="absolute -top-2 -right-2 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
