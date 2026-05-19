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
      colors: {
        // Black, white, grey palette only
        background: '#ffffff',
        foreground: '#0a0a0a',
        card: '#f5f5f5',
        'card-foreground': '#0a0a0a',
        border: '#e0e0e0',
        input: '#e0e0e0',
        ring: '#0a0a0a',
        primary: {
          DEFAULT: '#0a0a0a',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f5f5f5',
          foreground: '#0a0a0a',
        },
        muted: {
          DEFAULT: '#f0f0f0',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#e8e8e8',
          foreground: '#0a0a0a',
        },
        destructive: {
          DEFAULT: '#1a1a1a',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#2d2d2d',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#4a4a4a',
          foreground: '#ffffff',
        },
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
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
