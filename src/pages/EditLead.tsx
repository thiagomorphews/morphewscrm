import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FUNNEL_STAGES, FunnelStage } from '@/types/lead';
import { useLead, useUpdateLead } from '@/hooks/useLeads';

export default function EditLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lead, isLoading: isLoadingLead } = useLead(id);
  const updateLead = useUpdateLead();
  
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    instagram: '',
    followers: '',
    whatsapp: '',
    email: '',
    stage: 'prospect' as FunnelStage,
    stars: 3,
    assigned_to: '',
    whatsapp_group: '',
    desired_products: '',
    negotiated_value: '',
    paid_value: '',
    observations: '',
    meeting_date: '',
    meeting_time: '',
    meeting_link: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        specialty: lead.specialty || '',
        instagram: lead.instagram || '',
        followers: lead.followers?.toString() || '',
        whatsapp: lead.whatsapp || '',
        email: lead.email || '',
        stage: lead.stage,
        stars: lead.stars,
        assigned_to: lead.assigned_to || '',
        whatsapp_group: lead.whatsapp_group || '',
        desired_products: lead.desired_products || '',
        negotiated_value: lead.negotiated_value?.toString() || '',
        paid_value: lead.paid_value?.toString() || '',
        observations: lead.observations || '',
        meeting_date: lead.meeting_date || '',
        meeting_time: lead.meeting_time || '',
        meeting_link: lead.meeting_link || '',
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    await updateLead.mutateAsync({
      id,
      name: formData.name,
      specialty: formData.specialty,
      instagram: formData.instagram,
      followers: formData.followers ? parseInt(formData.followers) : null,
      whatsapp: formData.whatsapp,
      email: formData.email || null,
      stage: formData.stage,
      stars: formData.stars,
      assigned_to: formData.assigned_to,
      whatsapp_group: formData.whatsapp_group || null,
      desired_products: formData.desired_products || null,
      negotiated_value: formData.negotiated_value ? parseFloat(formData.negotiated_value) : null,
      paid_value: formData.paid_value ? parseFloat(formData.paid_value) : null,
      observations: formData.observations || null,
      meeting_date: formData.meeting_date || null,
      meeting_time: formData.meeting_time || null,
      meeting_link: formData.meeting_link || null,
    });
    
    navigate(`/leads/${id}`);
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoadingLead) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Editar Lead</h1>
            <p className="text-muted-foreground">{lead?.name}</p>
          </div>
          <Button type="submit" className="gap-2" disabled={updateLead.isPending}>
            {updateLead.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Informações Básicas</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Dr. João Silva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade *</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => updateField('specialty', e.target.value)}
                placeholder="Ex: Dermatologista"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram *</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => updateField('instagram', e.target.value)}
                  placeholder="@usuario"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followers">Seguidores</Label>
                <Input
                  id="followers"
                  type="number"
                  value={formData.followers}
                  onChange={(e) => updateField('followers', e.target.value)}
                  placeholder="Ex: 50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => updateField('whatsapp', e.target.value)}
                placeholder="5511999999999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Status & Classification */}
          <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Status & Classificação</h2>
            
            <div className="space-y-2">
              <Label>Importância do Lead</Label>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <StarRating
                  rating={formData.stars as 1 | 2 | 3 | 4 | 5}
                  onChange={(stars) => updateField('stars', stars)}
                  size="lg"
                  interactive
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Etapa do Funil *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => updateField('stage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNNEL_STAGES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Responsável *</Label>
              <Input
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => updateField('assigned_to', e.target.value)}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_group">Nome do Grupo WhatsApp</Label>
              <Input
                id="whatsapp_group"
                value={formData.whatsapp_group}
                onChange={(e) => updateField('whatsapp_group', e.target.value)}
                placeholder="Ex: Grupo João - Negociação"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="negotiated_value">Valor Negociado (R$)</Label>
                <Input
                  id="negotiated_value"
                  type="number"
                  step="0.01"
                  value={formData.negotiated_value}
                  onChange={(e) => updateField('negotiated_value', e.target.value)}
                  placeholder="Ex: 25000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_value">Valor Pago (R$)</Label>
                <Input
                  id="paid_value"
                  type="number"
                  step="0.01"
                  value={formData.paid_value}
                  onChange={(e) => updateField('paid_value', e.target.value)}
                  placeholder="Ex: 25000"
                />
              </div>
            </div>
          </div>

          {/* Meeting Info */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Reunião</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting_date">Data da Reunião</Label>
                <Input
                  id="meeting_date"
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => updateField('meeting_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_time">Hora</Label>
                <Input
                  id="meeting_time"
                  type="time"
                  value={formData.meeting_time}
                  onChange={(e) => updateField('meeting_time', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_link">Link da Reunião</Label>
                <Input
                  id="meeting_link"
                  value={formData.meeting_link}
                  onChange={(e) => updateField('meeting_link', e.target.value)}
                  placeholder="https://calendar.app.google/..."
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Informações Adicionais</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desired_products">Produtos de Interesse</Label>
                <Textarea
                  id="desired_products"
                  value={formData.desired_products}
                  onChange={(e) => updateField('desired_products', e.target.value)}
                  placeholder="Quais produtos o lead demonstrou interesse?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => updateField('observations', e.target.value)}
                  placeholder="Anotações importantes sobre o lead..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}
