interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string
  label?: string
}

function FAB({ icon = 'add', label = 'Adicionar', className = '', ...props }: FABProps) {
  return (
    <button
      aria-label={label}
      className={[
        'fixed bottom-20 right-4 z-20',
        'flex items-center justify-center w-14 h-14 rounded-fab',
        'bg-primary text-on-primary shadow-tier3',
        'hover:bg-primary-hover active:bg-primary-hover',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className,
      ].join(' ')}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      {...props}
    >
      <span className="material-symbols-outlined text-2xl" aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}

export { FAB }
