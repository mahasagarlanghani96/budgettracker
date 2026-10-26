import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--emerald-dim)] text-[var(--emerald)]',
        secondary: 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)]',
        destructive: 'border-transparent bg-[var(--coral-dim)] text-[var(--coral)]',
        success: 'border-transparent bg-[var(--emerald-dim)] text-[var(--emerald)]',
        warning: 'border-transparent bg-[var(--amber-dim)] text-[var(--amber)]',
        outline: 'border-[var(--glass-border)] text-[var(--text-secondary)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
