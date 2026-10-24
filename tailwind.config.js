/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['Fraunces', 'var(--cjk-serif)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Outfit', 'var(--cjk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poster: ['"Bebas Neue"', 'Oswald', 'var(--cjk)', 'Impact', 'sans-serif'],
        cond: ['Oswald', 'var(--cjk)', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
