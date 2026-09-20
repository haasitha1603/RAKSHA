import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
          foreground: 'var(--primary-foreground)',
        },
        safe: {
          DEFAULT: 'var(--safe)',
          bg: 'var(--safe-bg)',
        },
        caution: {
          DEFAULT: 'var(--caution)',
          bg: 'var(--caution-bg)',
        },
        check: {
          DEFAULT: 'var(--check)',
          bg: 'var(--check-bg)',
        },
        emergency: {
          DEFAULT: 'var(--emergency)',
          text: 'var(--emergency-text)',
          bg: 'var(--emergency-bg)',
        },
        border: 'var(--border)',
        'input-bg': 'var(--input-bg)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        card: '1rem',
      },
      keyframes: {
        'sos-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { transform: 'scale(1.04)', opacity: '0.95', boxShadow: '0 0 0 16px rgba(220, 38, 38, 0)' },
        },
        'ring-wave': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        }
      },
      animation: {
        'sos-pulse': 'sos-pulse 2.4s ease-in-out infinite',
        'ring-wave': 'ring-wave 1.8s ease-out infinite',
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
} satisfies Config;
