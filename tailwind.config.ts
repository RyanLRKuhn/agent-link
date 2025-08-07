import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        primary: {
          DEFAULT: '#15803D',
          hover: '#166534',
        },
        surface: {
          0: '#0A0E1A',
          1: '#1A1F2E',
          2: '#252B3B',
          3: '#2F364A',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          dark: '#1E293B',
        },
        border: {
          DEFAULT: '#334155',
          hover: '#475569',
        },
        status: {
          success: '#15803D',
          error: '#DC2626',
          warning: '#D97706',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(21, 128, 61, 0.15)',
        'glow-md': '0 0 20px rgba(21, 128, 61, 0.15)',
        'glow-lg': '0 0 30px rgba(21, 128, 61, 0.15)',
        'inner-top': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'inner-bottom': 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'primary-sheen': 'linear-gradient(45deg, rgba(21, 128, 61, 0.1) 0%, rgba(34, 197, 94, 0.3) 50%, rgba(21, 128, 61, 0.1) 100%)',
        'surface-sheen-1': 'linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
        'surface-sheen-2': 'linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 100%)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'flow-down': 'flow-down 1.5s ease-in-out infinite',
        'flow-pulse': 'flow-pulse 1.5s ease-in-out infinite',
        'sheen': 'sheen 10s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(21, 128, 61, 0.15)' },
          '50%': { boxShadow: '0 0 20px rgba(21, 128, 61, 0.15)' },
          '100%': { boxShadow: '0 0 5px rgba(21, 128, 61, 0.15)' },
        },
        pulse: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'flow-down': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'flow-pulse': {
          '0%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '0.3', transform: 'scale(1)' },
        },
        'sheen': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config; 