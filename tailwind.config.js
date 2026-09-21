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
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl2: '1.15rem',
      },
    },
  },
  plugins: [],
};
