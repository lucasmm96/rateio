import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          container: 'var(--color-primary-container)',
        },
        'on-primary': 'var(--color-on-primary)',
        'on-primary-container': 'var(--color-on-primary-container)',
        secondary: {
          container: 'var(--color-secondary-container)',
        },
        'on-secondary-container': 'var(--color-on-secondary-container)',
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          container: {
            DEFAULT: 'var(--color-surface-container)',
            high: 'var(--color-surface-container-high)',
            low: 'var(--color-surface-container-low)',
            lowest: 'var(--color-surface-container-lowest)',
          },
        },
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        outline: 'var(--color-outline)',
        tertiary: 'var(--color-tertiary)',
        error: {
          DEFAULT: 'var(--color-error)',
          container: 'var(--color-error-container)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          container: 'var(--color-warning-container)',
        },
        success: 'var(--color-success)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.03em', fontWeight: '600' }],
        'currency-display': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'currency-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
        fab: '1.5rem',
      },
      spacing: {
        gutter: '0.75rem',
        margin: '1rem',
      },
      boxShadow: {
        tier2: '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        tier3: '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
