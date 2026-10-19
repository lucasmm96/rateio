type BadgeVariant = 'a-receber' | 'deve' | 'prevista' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  'a-receber':
    'bg-primary-container text-on-primary-container dark:bg-primary-container dark:text-on-primary-container',
  deve:
    'bg-error-container text-error',
  prevista:
    'bg-warning-container text-warning',
  default:
    'bg-surface text-on-surface-variant border border-outline',
}

function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-label-sm font-semibold h-6 whitespace-nowrap',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export { Badge }
