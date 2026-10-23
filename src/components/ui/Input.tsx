import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-label-lg text-on-surface">
            {label}
          </label>
        )}
        <div
          className={[
            'flex items-center h-11 rounded-lg border bg-background',
            'transition duration-150',
            error
              ? 'border-error focus-within:ring-2 focus-within:ring-error'
              : 'border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary',
          ].join(' ')}
        >
          {prefix && (
            <span className="pl-3 text-body-md text-on-surface-variant select-none">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'flex-1 h-full bg-transparent px-3 text-body-lg text-on-surface',
              'placeholder:text-on-surface-variant outline-none',
              prefix ? 'pl-1' : '',
              suffix ? 'pr-1' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {suffix && (
            <span className="pr-3 text-body-md text-on-surface-variant select-none">{suffix}</span>
          )}
        </div>
        {(error || hint) && (
          <p className={['text-body-sm', error ? 'text-error' : 'text-on-surface-variant'].join(' ')}>
            {error || hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
export { Input }
