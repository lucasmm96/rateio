import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary',
  secondary:
    'bg-primary-container text-on-primary-container hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary',
  outline:
    'border border-outline bg-transparent text-on-surface hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary',
  ghost:
    'bg-transparent text-on-surface hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-label-md',
  md: 'h-12 px-6 text-label-lg',
  lg: 'h-14 px-8 text-body-lg font-semibold',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded font-medium',
          'transition duration-150 outline-none',
          'active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <span className="material-symbols-outlined animate-spin text-[18px]">
            progress_activity
          </span>
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
export { Button }
