import { useState } from "react";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ZApiConfigDialogProps {
  instanceId: string;
  instanceName: string;
  currentConfig?: {
    z_api_instance_id: string | null;
    z_api_token: string | null;
    z_api_client_token: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ZApiConfigDialog({
  instanceId,
  instanceName,
  currentConfig,
  open,
  onOpenChange,
  onSaved,
}: ZApiConfigDialogProps) {
  const [zapiInstanceId, setZapiInstanceId] = useState(currentConfig?.z_api_instance_id || "");
  const [zapiToken, setZapiToken] = useState(currentConfig?.z_api_token || "");
  const [zapiClientToken, setZapiClientToken] = useState(currentConfig?.z_api_client_token || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!zapiInstanceId.trim() || !zapiToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Instance ID e Token do Z-API",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update({
          z_api_instance_id: zapiInstanceId.trim(),
          z_api_token: zapiToken.trim(),
          z_api_client_token: zapiClientToken.trim() || null,
          status: "pending",
        })
        .eq("id", instanceId);

      if (error) throw error;

      toast({
        title: "Credenciais salvas!",
        description: "Agora você pode gerar o QR Code",
      });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Z-API - {instanceName}</DialogTitle>
          <DialogDescription>
            Insira as credenciais da sua instância Z-API para conectar o WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              Como obter as credenciais:
            </p>
            <ol className="list-decimal list-inside text-blue-700 dark:text-blue-300 space-y-1">
              <li>Acesse o painel Z-API</li>
              <li>Crie uma nova instância</li>
              <li>Copie o Instance ID e Token</li>
            </ol>
            <a
              href="https://app.z-api.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
            >
              Acessar Z-API <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-instance-id">Instance ID *</Label>
            <Input
              id="zapi-instance-id"
              placeholder="Ex: 3C4B5A6D7E8F9A0B1C2D3E4F"
              value={zapiInstanceId}
              onChange={(e) => setZapiInstanceId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-token">Token *</Label>
            <Input
              id="zapi-token"
              placeholder="Ex: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
              value={zapiToken}
              onChange={(e) => setZapiToken(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-client-token">Client Token (opcional)</Label>
            <Input
              id="zapi-client-token"
              placeholder="Se você usar conta com Client Token"
              value={zapiClientToken}
              onChange={(e) => setZapiClientToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Apenas para contas Z-API com autenticação Client Token
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Credenciais
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
