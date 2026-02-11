/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#f5efe6', light: '#faf6f0', dark: '#ede4d6' },
        terra: { DEFAULT: '#c35b3c', dark: '#9f4a30', light: '#d4816a' },
        forest: { DEFAULT: '#1f5b3b', dark: '#154a2e', light: '#2a7a50' },
        charcoal: '#1b1b1b',
        muted: '#5a5a5a',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Source Serif 4', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(27, 27, 27, 0.05)',
        'warm': '0 8px 30px rgba(27, 27, 27, 0.07)',
        'deep': '0 20px 60px rgba(27, 27, 27, 0.10)',
      },
    },
  },
  plugins: [],
}
