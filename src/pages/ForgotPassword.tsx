import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-card p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-funnel-waiting-payment/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-funnel-waiting-payment" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Senha provisória enviada!
            </h1>
            <p className="text-muted-foreground mb-4">
              Enviamos uma <strong>senha provisória</strong> para <strong>{email}</strong>.
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              Use essa senha para fazer login. Você será solicitado a criar uma nova senha segura.
            </p>

            <Link to="/login">
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Ir para o login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-card p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Esqueceu a senha?
            </h1>
            <p className="text-muted-foreground mt-2">
              Digite seu e-mail e enviaremos uma senha provisória para você fazer login.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar senha provisória
            </Button>

            <Link to="/login">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Button>
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
