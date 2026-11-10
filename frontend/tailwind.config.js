/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                voh: {
                    bg: '#0a0a14',
                    surface: '#12121f',
                    card: '#1a1a2e',
                    border: '#2d2d4a',
                    accent: '#f59e0b',
                    gold: '#d97706',
                    muted: '#94a3b8',
                    text: '#e2e8f0',
                    success: '#22c55e',
                    error: '#ef4444',
                    info: '#3b82f6',
                },
            },
            backgroundImage: {
                'heritage-gradient': 'linear-gradient(135deg, #0a0a14 0%, #1a0a2e 50%, #0a1a2e 100%)',
                'gold-gradient': 'linear-gradient(135deg, #f59e0b, #d97706)',
                'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            boxShadow: {
                'glow-gold': '0 0 30px rgba(245, 158, 11, 0.15)',
                'glow-blue': '0 0 30px rgba(59, 130, 246, 0.15)',
                'glass': '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            },
        },
    },
    plugins: [],
};
