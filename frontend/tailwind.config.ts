import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#121316', // Deep charcoal
        surface: {
          DEFAULT: '#1A1B20',
          hover: '#24252B',
          muted: '#2A2B32',
        },
        card: '#1E1F25',
        border: '#2E3039',
        accent: {
          DEFAULT: '#8B5CF6', // Subtle Purple Accent
          hover: '#7C3AED',
          light: '#A78BFA',
          subtle: '#2E2248',
        },
        text: {
          primary: '#F3F4F6', // Off-white/cream
          secondary: '#9CA3AF',
          muted: '#6B7280',
        },
        sand: {
          50: '#FAF8F5',
          100: '#F5F2EB',
          200: '#EBE5D8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 20px -5px rgba(139, 92, 246, 0.3)',
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
