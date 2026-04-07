import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {}
  },
  plugins: []
}

export default config
