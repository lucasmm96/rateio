import { useId } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const id = useId()

  return (
    <div className="flex items-center gap-3">
      {label && (
        <label htmlFor={id} className="text-body-md text-on-surface cursor-pointer select-none">
          {label}
        </label>
      )}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 rounded-full transition-colors duration-200',
          'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          checked ? 'bg-primary' : 'bg-outline',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-on-primary shadow-sm',
            'transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

export { Switch }
