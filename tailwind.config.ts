import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-ch) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-ch) / <alpha-value>)',
          container: 'rgb(var(--color-primary-container-ch) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--color-on-primary-ch) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--color-on-primary-container-ch) / <alpha-value>)',
        secondary: {
          container: 'rgb(var(--color-secondary-container-ch) / <alpha-value>)',
        },
        'on-secondary-container': 'rgb(var(--color-on-secondary-container-ch) / <alpha-value>)',
        background: 'rgb(var(--color-background-ch) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface-ch) / <alpha-value>)',
          variant: 'rgb(var(--color-surface-variant-ch) / <alpha-value>)',
          container: {
            DEFAULT: 'rgb(var(--color-surface-container-ch) / <alpha-value>)',
            high: 'rgb(var(--color-surface-container-high-ch) / <alpha-value>)',
            low: 'rgb(var(--color-surface-container-low-ch) / <alpha-value>)',
            lowest: 'rgb(var(--color-surface-container-lowest-ch) / <alpha-value>)',
          },
        },
        'on-surface': 'rgb(var(--color-on-surface-ch) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant-ch) / <alpha-value>)',
        outline: 'rgb(var(--color-outline-ch) / <alpha-value>)',
        'outline-variant': 'rgb(var(--color-outline-variant-ch) / <alpha-value>)',
        tertiary: 'rgb(var(--color-tertiary-ch) / <alpha-value>)',
        error: {
          DEFAULT: 'rgb(var(--color-error-ch) / <alpha-value>)',
          container: 'var(--color-error-container)',
        },
        'on-error': 'rgb(var(--color-on-error-ch) / <alpha-value>)',
        'on-error-container': 'rgb(var(--color-on-error-container-ch) / <alpha-value>)',
        warning: {
          DEFAULT: 'rgb(var(--color-warning-ch) / <alpha-value>)',
          container: 'var(--color-warning-container)',
        },
        success: 'rgb(var(--color-success-ch) / <alpha-value>)',
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
        'title-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'body-xs': ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
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
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
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
