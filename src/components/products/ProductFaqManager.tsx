import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, HelpCircle, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface ProductFaq {
  id?: string;
  question: string;
  answer: string;
  position: number;
}

interface ProductFaqManagerProps {
  faqs: ProductFaq[];
  onChange: (faqs: ProductFaq[]) => void;
}

export function ProductFaqManager({ faqs, onChange }: ProductFaqManagerProps) {
  const addFaq = () => {
    const newFaq: ProductFaq = {
      question: '',
      answer: '',
      position: faqs.length,
    };
    onChange([...faqs, newFaq]);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    // Recalculate positions
    updated.forEach((faq, i) => (faq.position = i));
    onChange(updated);
  };

  const moveFaq = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= faqs.length) return;
    const updated = [...faqs];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    // Recalculate positions
    updated.forEach((faq, i) => (faq.position = i));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <HelpCircle className="h-4 w-4" />
        <span>Adicione perguntas frequentes sobre o produto (posologia, interações, precauções, etc.)</span>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum FAQ adicionado</p>
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <Card key={faq.id || index} className="relative">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveFaq(index, index - 1)}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Pergunta (ex: Qual a posologia recomendada?)"
                      value={faq.question}
                      onChange={(e) => updateFaq(index, 'question', e.target.value)}
                    />
                    <Textarea
                      placeholder="Resposta detalhada..."
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFaq(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar FAQ
          </Button>
        </div>
      )}
    </div>
  );
}
