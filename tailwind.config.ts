import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a18',
        paper: '#faf9f6',
        'paper-warm': '#f5f2ed',
        muted: '#6b6862',
        hint: '#9c9a92',
        copper: '#9a7b4f',
        'copper-light': '#c4a87a',
        'score-high': '#2d5a47',
        'score-high-bg': '#eef4f0',
        'score-mid': '#8b6c2f',
        'score-mid-bg': '#f8f3ea',
        'score-low': '#8b3a2f',
        'score-low-bg': '#f8efed',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
export default config
