import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Search, LogOut, Shield, Users, Heart, Palette, Sun, Sparkles, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout() {
  const { user, profile, role, isAdmin, signOut } = useAuth();
  const { theme, setTheme, showNoticeAgain } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Eventos' },
    { to: '/volunteers', icon: Heart, label: 'Voluntários' },
    { to: '/search', icon: Search, label: 'Buscar' },
    ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Usuários' }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0].toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-transparent relative">
      {/* Clean SaaS header */}
      <header className="header-premium backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-10">
              <Link to="/dashboard" className="transition-opacity hover:opacity-80">
                <Logo size="sm" />
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {isActive && (
                        <span className="absolute left-3 right-3 -bottom-[17px] h-0.5 bg-primary rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="badge-premium hidden sm:inline-flex">
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </span>
              )}

              {/* Theme Switcher Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-orange-400" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-orange-600" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 font-sans">
                  <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                    Tema da Interface
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setTheme('orange-liquid')}
                    className={cn('flex items-center gap-2 cursor-pointer font-semibold text-xs rounded-lg py-2', theme === 'orange-liquid' && 'bg-primary/15 text-primary font-bold')}
                  >
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Liquid Laranja
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className={cn('flex items-center gap-2 cursor-pointer font-semibold text-xs rounded-lg py-2', theme === 'dark' && 'bg-primary/15 text-primary font-bold')}
                  >
                    <Moon className="w-4 h-4 text-orange-400" />
                    Modo Escuro (Dark)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-muted">
                    <Avatar className="h-9 w-9 border-2 border-border">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{profile?.full_name || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {role || 'operador'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-medium cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl">
        <div className="flex justify-around py-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-lg transition-all',
                  isActive ? 'bg-primary/10' : ''
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 pb-28 md:pb-10">
        <Outlet />
      </main>
    </div>
  );
}
