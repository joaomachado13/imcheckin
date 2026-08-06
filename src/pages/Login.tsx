import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import {
  Loader2,
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Users2,
  BarChart3,
  QrCode,
  Ticket,
} from 'lucide-react';
import loginImage from '@/assets/login-checkin.jpg.asset.json';

const highlights = [
  { icon: Activity, label: 'Controle em tempo real' },
  { icon: Users2, label: 'Gestão por ministérios' },
  { icon: BarChart3, label: 'Relatórios completos' },
  { icon: QrCode, label: 'Check-in rápido e seguro' },
];

const stats = [
  { value: '+15.000', label: 'Ingressos Gerenciados' },
  { value: '+5.000', label: 'Check-ins Realizados' },
  { value: '+30', label: 'Eventos Cadastrados' },
];

export default function Login() {
  const { user, loading, approvalStatus, signIn } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent gap-4">
        <Logo size="lg" className="animate-pulse" />
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <main className="w-full max-w-6xl rounded-[28px] overflow-hidden border border-white/60 bg-card shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[620px] animate-fade-in">
        {/* ============ Painel esquerdo: imagem real + overlay ============ */}
        <section className="relative lg:col-span-6 xl:col-span-7 min-h-[320px] flex flex-col justify-between p-8 sm:p-10 lg:p-12 overflow-hidden">
          <img
            src={loginImage.url}
            alt="Equipe do im.CHECK-IN recepcionando participantes em um evento"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,102,0,0.85), rgba(255,140,0,0.65))',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(17,17,17,0.55),transparent_60%)]" />

          {/* marca */}
          <div className="relative z-10 flex items-center gap-3 animate-fade-in">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-display text-2xl font-extrabold tracking-tight text-primary-foreground">
              im.<span className="font-black">CHECK-IN</span>
            </span>
          </div>

          {/* headline */}
          <div className="relative z-10 my-10 space-y-8 animate-slide-up">
            <div className="space-y-5">
              <h1 className="font-display text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight text-primary-foreground max-w-xl">
                GESTÃO INTELIGENTE DE EVENTOS
              </h1>
              <p className="text-primary-foreground/90 text-sm sm:text-base font-medium leading-relaxed max-w-md">
                Controle ingressos, resgates e check-ins em tempo real com uma plataforma
                simples, rápida e eficiente.
              </p>
            </div>

            <ul className="grid sm:grid-cols-2 gap-3 max-w-lg">
              {highlights.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md px-4 py-4 text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/25"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 border border-white/30">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold leading-snug">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div aria-hidden="true" />

        </section>

        {/* ============ Painel direito: formulário ============ */}
        <section className="lg:col-span-6 xl:col-span-5 p-8 sm:p-10 lg:p-12 bg-card flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-8">
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Entrar na conta
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Acesse o painel de gestão de eventos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                    required
                    className="h-12 pl-10 text-sm font-medium bg-secondary/60 border-border rounded-xl transition-all focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-foreground">
                    Senha
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isSubmitting}
                    required
                    className="h-12 pl-10 pr-11 text-sm font-medium bg-secondary/60 border-border rounded-xl transition-all focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="btn-premium w-full h-12 rounded-xl text-sm font-bold gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Acessando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar no sistema
                  </>
                )}
              </Button>
            </form>

            <div className="pt-5 border-t border-border text-center">
              <p className="text-xs text-muted-foreground font-semibold">
                Ainda não possui uma conta?{' '}
                <Link
                  to="/signup"
                  className="text-primary hover:underline font-extrabold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Cadastrar agora
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
