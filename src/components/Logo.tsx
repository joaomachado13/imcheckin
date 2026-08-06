import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'text-xl', text: 'text-sm' },
  md: { icon: 'text-2xl', text: 'text-base' },
  lg: { icon: 'text-4xl', text: 'text-xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Ticket className={cn('text-primary shrink-0', config.mark)} aria-hidden="true" strokeWidth={2} />
      {/* im. wordmark */}
      <div className="flex items-baseline">
        <span className={cn('font-display font-bold text-foreground', config.icon)}>im</span>
        <span className={cn('text-primary font-bold', config.icon)}>.</span>
      </div>

      {showText && (
        <span className={cn('font-display font-semibold tracking-wide text-muted-foreground uppercase', config.text)}>
          CHECK-IN
        </span>
      )}
    </div>
  );
}
