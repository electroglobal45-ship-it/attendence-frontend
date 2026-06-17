import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      colors: {
        // Trello-inspired color palette
        trello: {
          blue: '#0079BF',
          'blue-dark': '#026AA7',
          'blue-light': '#5BA4CF',
          'blue-lighter': '#E4F0F6',
        },
        board: {
          bg: '#0079BF',
          'bg-dark': '#026AA7',
        },
        list: {
          bg: '#EBECF0',
          'bg-hover': '#DFE1E6',
        },
        card: {
          bg: '#FFFFFF',
          'bg-hover': '#F4F5F7',
        },
        text: {
          primary: '#172B4D',
          secondary: '#5E6C84',
          tertiary: '#8993A4',
          white: '#FFFFFF',
        },
        border: {
          light: '#DFE1E6',
          medium: '#C1C7D0',
          dark: '#091E4224',
        },
        label: {
          green: '#61BD4F',
          yellow: '#F2D600',
          orange: '#FF9F1A',
          red: '#EB5A46',
          purple: '#C377E0',
          blue: '#0079BF',
          sky: '#00C2E0',
          lime: '#51E898',
          pink: '#FF78CB',
          black: '#344563',
        },
        status: {
          success: '#61BD4F',
          warning: '#F2D600',
          danger: '#EB5A46',
          info: '#0079BF',
        },
        // Legacy colors for backward compatibility
        background: '#ffffff',
        foreground: '#172B4D',
        grey: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      borderRadius: {
        'trello-sm': '3px',
        'trello-md': '8px',
        'trello-lg': '12px',
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        'trello-card': '0 1px 0 rgba(9, 30, 66, 0.13)',
        'trello-card-hover': '0 4px 8px rgba(9, 30, 66, 0.25)',
        'trello-list': '0 1px 2px rgba(9, 30, 66, 0.13)',
        'trello-modal': '0 8px 16px rgba(9, 30, 66, 0.25)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        jakarta: ['var(--font-plus-jakarta)', 'sans-serif'],
      },
      spacing: {
        'trello-1': '4px',
        'trello-2': '8px',
        'trello-3': '12px',
        'trello-4': '16px',
        'trello-6': '24px',
        'trello-8': '32px',
      },
      width: {
        'trello-list': '272px',
      },
      minWidth: {
        'trello-list': '272px',
      },
      maxWidth: {
        'trello-list': '272px',
      },
    },
  },
  plugins: [],
}

export default config
