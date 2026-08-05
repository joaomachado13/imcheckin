import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, LogOut } from 'lucide-react';

export default function Rejected() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/');
      } else if (profile?.approval_status === 'approved') {
        navigate('/dashboard');
      } else if (profile?.approval_status === 'pending') {
        navigate('/pending-approval');
      }
    }
  }, [user, profile, loading, navigate]);

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

        <Card className="shadow-lg border-destructive/50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Acesso Negado</CardTitle>
            <CardDescription className="mt-2">
              Infelizmente sua solicitação de acesso foi negada por um administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>
                Se você acredita que isso foi um erro, entre em contato com um administrador do sistema para mais informações.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
