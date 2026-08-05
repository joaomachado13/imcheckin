import { useState } from 'react';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Sparkles, Moon, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemePopoutNotice() {
  const { theme, setTheme, hasSeenNotice, dismissNotice } = useTheme();
  const [isOpen, setIsOpen] = useState(!hasSeenNotice);

  const handleClose = () => {
    dismissNotice();
    setIsOpen(false);
  };

  const themes: { id: ThemeMode; title: string; desc: string; icon: any; previewBg: string; textColor: string }[] = [
    {
      id: 'orange-liquid',
      title: 'Laranja Liquid (v4)',
      desc: 'Fundo vibrante em gradiente com efeito vidro líquido e tipografia Syne.',
      icon: Sparkles,
      previewBg: 'from-orange-400 via-orange-500 to-amber-500',
      textColor: 'text-amber-900',
    },
    {
      id: 'soft-light',
      title: 'Modo Claro Soft (v2)',
      desc: 'Tom claro suave com tom laranja diluído para ambientes muito iluminados.',
      icon: Sun,
      previewBg: 'from-orange-100 via-amber-50 to-orange-200',
      textColor: 'text-orange-950',
    },
    {
      id: 'dark',
      title: 'Modo Escuro (Dark)',
      desc: 'Visual escuro elegante com destaques em laranja para uso noturno.',
      icon: Moon,
      previewBg: 'from-zinc-900 via-neutral-900 to-amber-950',
      textColor: 'text-zinc-100',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md rounded-2xl glass-card-v4 border-white/40 p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold w-fit">
            <Palette className="w-3.5 h-3.5" />
            Nova Aparência & Temas
          </div>
          <DialogTitle className="font-display text-2xl font-extrabold text-foreground">
            Escolha seu estilo de tela
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Agora você pode alternar facilmente entre o <strong>Laranja Liquid (v4)</strong>, o <strong>Modo Claro Soft</strong> ou o <strong>Modo Escuro</strong> a qualquer momento pelo menu superior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {themes.map((item) => {
            const isSelected = theme === item.id;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={cn(
                  'group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-md'
                    : 'border-border/60 bg-card/60 hover:bg-card hover:border-border'
                )}
              >
                <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white shadow-sm shrink-0', item.previewBg)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground font-display">{item.title}</h4>
                    {isSelected && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-2">
          <Button
            onClick={handleClose}
            className="w-full btn-premium h-11 text-base font-bold text-white rounded-xl"
          >
            Confirmar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
