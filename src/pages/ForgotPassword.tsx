import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Informe seu email');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (error) throw error;
      setSent(true);
      toast.success('Enviamos um link para redefinir sua senha');
    } catch (error: any) {
      toast.error('Erro ao enviar o link: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
        </div>

        <Card className="shadow-xl border-border/50">
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary rounded-t-lg" />
          <CardHeader className="text-center pt-8 pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              {sent ? (
                <CheckCircle2 className="h-7 w-7 text-primary" />
              ) : (
                <KeyRound className="h-7 w-7 text-primary" />
              )}
            </div>
            <CardTitle className="font-display text-2xl">
              {sent ? 'Verifique seu email' : 'Esqueci minha senha'}
            </CardTitle>
            <CardDescription className="text-base">
              {sent
                ? `Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Confira também a caixa de spam.`
                : 'Informe seu email e enviaremos um link para criar uma nova senha.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {!sent && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 font-semibold">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 text-base"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full btn-premium text-primary-foreground h-12 text-base font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link to="/" className="text-sm text-primary hover:underline font-bold inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
