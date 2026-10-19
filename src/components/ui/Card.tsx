interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
}

function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-md bg-surface border border-outline p-4',
        variant === 'elevated' ? 'shadow-tier2' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['flex items-center justify-between mb-3', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={['text-headline-sm text-on-surface', className].join(' ')} {...props}>
      {children}
    </h3>
  )
}

function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['text-body-md text-on-surface-variant', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export { Card, CardContent, CardHeader, CardTitle }
