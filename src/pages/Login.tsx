import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2, LogIn, Mail, Lock, Eye, EyeOff, ShieldCheck, Ticket } from 'lucide-react';

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
        <div className="h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Central Login Card inspired by high-end Nagad / SaaS layout */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/60 grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        
        {/* Left Side: Vibrant Orange Brand Banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative atmosphere circles */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-inner">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-black text-2xl text-white tracking-tight">
              im.<span className="text-amber-200 font-extrabold">CHECK-IN</span>
            </span>
          </div>

          {/* Center Message */}
          <div className="relative z-10 my-8 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
              Bem-vindo ao im.CHECK-IN
            </h2>
            <p className="text-orange-100 text-sm font-medium leading-relaxed">
              Sua plataforma completa para gestão inteligente de ingressos, check-in e resgates em tempo real com agilidade profissional.
            </p>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-orange-100 pt-4 border-t border-white/20">
            <ShieldCheck className="w-4 h-4 text-amber-200" />
            <span>Sistema Seguro & Integrado</span>
          </div>
        </div>

        {/* Right Side: Clean Professional Form */}
        <div className="md:col-span-7 p-8 sm:p-10 bg-white text-stone-900 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-6">
            
            <div className="space-y-1 text-left">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Entrar na Conta
              </h1>
              <p className="text-sm text-stone-600 font-semibold">
                Preencha seus dados para acessar o painel de eventos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                  <Mail className="h-3.5 w-3.5 text-orange-600" />
                  Email corporativo ou pessoal
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 text-sm font-semibold bg-stone-50 border-stone-300 text-stone-900 rounded-xl focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Lock className="h-3.5 w-3.5 text-orange-600" />
                    Senha de acesso
                  </Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isSubmitting}
                    required
                    className="h-11 text-sm font-semibold bg-stone-50 border-stone-300 text-stone-900 rounded-xl focus:bg-white focus:border-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all gap-2 mt-2"
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
                    Entrar no Sistema
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 text-center border-t border-stone-200">
              <p className="text-xs text-stone-600 font-semibold">
                Ainda não possui uma conta?{' '}
                <Link to="/signup" className="text-orange-600 hover:text-orange-700 font-extrabold hover:underline">
                  Cadastrar agora
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
