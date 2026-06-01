import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['Fraunces', 'serif'],
      },
      colors: {
        teal: { DEFAULT: '#0F6E56', mid: '#1D9E75', light: '#E1F5EE' },
        amber: { DEFAULT: '#854F0B', mid: '#BA7517', light: '#FAEEDA' },
        coral: { DEFAULT: '#993C1D', mid: '#D85A30', light: '#FAECE7' },
        purple: { DEFAULT: '#534AB7', mid: '#7F77DD', light: '#EEEDFE' },
        green: { DEFAULT: '#3B6D11', mid: '#639922', light: '#EAF3DE' },
        ink: '#1a1a18',
        muted: '#5a5a56',
        border: '#e0ddd5',
        bg: '#faf9f6',
        surface: '#ffffff',
        'surface-secondary': '#f5f4f0',
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
