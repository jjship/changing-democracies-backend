import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        red_mains: '#B85252',
        yellow_secondary: '#CF9855',
        gray_light_secondary: '#808881',
        green_accent: '#6BDBC6',
        black_bg: '#191818',
        turquoise: '#6bdbd6',
        darkRed: '#b85252',
        pink: '#e7d8dd',
        purple: '#8083AE',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      gridTemplateColumns: {
        '7-cols': 'repeat(7, minmax(0, 1fr))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(var(--start-y, 100vh))', opacity: '1' },
          to: { transform: 'translateY(var(--end-y))', opacity: '1' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.9s ease-in-out forwards',
        fadeIn: 'fadeIn 0.9s ease-in-out ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
