/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Casa Libre ink/paper palette
        ink: '#111111',
        paper: '#F9F4EE',
        card: '#FFFFFF',
        hatch1: '#EAE6DD',
        line: '#E4DED3',
        muted: '#6B6459',
        terracotta: '#C05F3C',
        good: '#3F7A54',
        warn: '#B7791F',
      },
      fontFamily: {
        sans: ['var(--font-grotesk)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 #111111',
        'hard-sm': '3px 3px 0 #111111',
        soft: '0 1px 2px rgba(17,17,17,.06), 0 4px 16px rgba(17,17,17,.06)',
      },
      borderRadius: {
        xl2: '1.15rem',
      },
    },
  },
  plugins: [],
};
