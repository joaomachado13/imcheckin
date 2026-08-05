import { cn } from '@/lib/utils';
import type { DeliveryStatus } from '@/types/database';

interface StatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

const statusConfig: Record<DeliveryStatus, { label: string; className: string; dotClassName: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-pending/10 text-pending border-pending/20',
    dotClassName: 'bg-pending',
  },
  parcial: {
    label: 'Parcial',
    className: 'bg-warning/10 text-warning border-warning/20',
    dotClassName: 'bg-warning',
  },
  resgatado: {
    label: 'Resgatado',
    className: 'bg-success/10 text-success border-success/20',
    dotClassName: 'bg-success',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClassName)} />
      {config.label}
    </span>
  );
}
