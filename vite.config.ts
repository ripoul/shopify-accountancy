import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/icons-material/ArrowDownwardRounded',
      '@mui/icons-material/ArrowUpwardRounded',
      '@mui/icons-material/SearchRounded',
    ],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        inline: [/@mui\/material/, /react-transition-group/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'node_modules/',
        'dist/',
        '**/*.test.*',
        'src/test-setup.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
