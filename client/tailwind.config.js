/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0A1628',
          light: '#162A4A',
          mid: '#0F172A',
        },
        gold: {
          DEFAULT: '#C8942A',
          bright: '#E5B94E',
          light: '#F0D078',
        },
        status: {
          available: '#22C55E',
          sold: '#EF4444',
          reserved: '#F59E0B',
          planning: '#8B5CF6',
        },
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200, 148, 42, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(200, 148, 42, 0)' },
        },
        'draw-check': {
          '0%': { strokeDashoffset: '50' },
          '100%': { strokeDashoffset: '0' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-out-right': 'slide-out-right 0.3s ease-in',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'draw-check': 'draw-check 0.5s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'stagger-1': 'fade-in-up 0.4s ease-out 0.05s both',
        'stagger-2': 'fade-in-up 0.4s ease-out 0.1s both',
        'stagger-3': 'fade-in-up 0.4s ease-out 0.15s both',
        'stagger-4': 'fade-in-up 0.4s ease-out 0.2s both',
        'stagger-5': 'fade-in-up 0.4s ease-out 0.25s both',
        'stagger-6': 'fade-in-up 0.4s ease-out 0.3s both',
        'stagger-7': 'fade-in-up 0.4s ease-out 0.35s both',
        'stagger-8': 'fade-in-up 0.4s ease-out 0.4s both',
      },
    },
  },
  plugins: [],
}
