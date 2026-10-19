interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const sizeClasses = {
  sm: 'h-8 w-8 text-label-sm',
  md: 'h-10 w-10 text-label-lg',
  lg: 'h-12 w-12 text-headline-sm',
}

function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      aria-label={name}
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-primary-container text-on-primary-container font-semibold select-none',
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {getInitials(name)}
    </div>
  )
}

export { Avatar }
