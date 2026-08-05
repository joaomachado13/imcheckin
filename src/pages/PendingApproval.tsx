import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export default function PendingApproval() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/');
      } else if (profile?.approval_status === 'approved') {
        navigate('/dashboard');
      } else if (profile?.approval_status === 'rejected') {
        navigate('/rejected');
      }
    }
  }, [user, profile, loading, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="mt-2">
              Sua conta foi criada com sucesso! Um administrador precisa aprovar seu acesso antes que você possa usar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">O que acontece agora?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Um administrador será notificado</li>
                <li>Seu acesso será analisado</li>
                <li>Você receberá acesso após a aprovação</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar Status
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
