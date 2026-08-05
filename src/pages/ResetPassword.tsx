import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2, Lock, ArrowLeft, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setReady(true);
        setInvalid(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Give the recovery link a moment to establish the session
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setReady(true);
            else setInvalid(true);
          });
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Senha atualizada! Faça login novamente.');
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast.error('Erro ao atualizar a senha: ' + error.message);
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
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Criar nova senha</CardTitle>
            <CardDescription className="text-base">
              {invalid
                ? 'Este link expirou ou é inválido. Solicite um novo link de recuperação.'
                : 'Defina uma nova senha para acessar o sistema.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {invalid ? (
              <Button
                className="w-full btn-premium text-primary-foreground h-12 text-base font-bold"
                onClick={() => navigate('/forgot-password')}
              >
                Solicitar novo link
              </Button>
            ) : !ready ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 font-semibold">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Nova senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="flex items-center gap-2 font-semibold">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar nova senha'
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
