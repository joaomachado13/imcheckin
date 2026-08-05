import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2, LogIn, Mail, Lock, Ticket, Users, ClipboardCheck, BarChart3 } from 'lucide-react';

export default function Login() {
  const { user, loading, approvalStatus, signIn } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (!loading && user) {
      if (approvalStatus === 'approved') {
        navigate('/dashboard');
      } else if (approvalStatus === 'pending') {
        navigate('/pending-approval');
      } else if (approvalStatus === 'rejected') {
        navigate('/rejected');
      }
    }
  }, [user, loading, approvalStatus, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(formData.email, formData.password);
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Ticket,
      title: 'Gestão de Eventos',
      description: 'Crie e gerencie múltiplos eventos com facilidade',
    },
    {
      icon: Users,
      title: 'Importação Rápida',
      description: 'Importe compradores direto do Google Sheets',
    },
    {
      icon: ClipboardCheck,
      title: 'Controle de Resgates',
      description: 'Registre retiradas com histórico completo',
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Exporte dados e acompanhe métricas em tempo real',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Logo size="lg" className="animate-pulse" />
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-6rem)]">
          {/* Left side - Content */}
          <div className="animate-slide-up">
            <Logo size="lg" className="mb-10" />
            <h1 className="font-display text-display-sm lg:text-display-md text-foreground mb-6">
              Gerencie seus ingressos com{' '}
              <span className="gradient-text">simplicidade</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Importe listas de compradores, controle resgates em tempo real e mantenha 
              tudo organizado para seus eventos.
            </p>

            {/* Features Grid with premium styling */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Login Card */}
          <div className="flex justify-center lg:justify-end animate-fade-in">
            <Card className="w-full max-w-md glass-card-v4 border-white/50 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Orange accent line */}
              <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
              
              <CardHeader className="text-center pt-8 pb-4">
                <CardTitle className="font-display text-3xl font-extrabold flex items-center justify-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                    <LogIn className="h-6 w-6 text-primary" />
                  </div>
                  Entrar
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-2 font-medium">
                  Acesse com sua conta para gerenciar eventos e resgates
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 font-bold text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isSubmitting}
                      className="h-12 text-base rounded-xl bg-card/80 border-border/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2 font-bold text-sm">
                      <Lock className="h-4 w-4 text-primary" />
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isSubmitting}
                      className="h-12 text-base rounded-xl bg-card/80 border-border/80"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full btn-premium text-white h-12 text-base font-bold rounded-xl shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Entrar na Plataforma
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline font-semibold transition-colors">
                    Esqueci minha senha
                  </Link>
                </div>

                <div className="mt-4 text-center border-t border-border/40 pt-4">
                  <p className="text-sm text-muted-foreground font-medium">
                    Não tem uma conta?{' '}
                    <Link to="/signup" className="text-primary hover:underline font-bold">
                      Criar conta
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
