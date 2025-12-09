import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This replaces the string 'process.env.API_KEY' in your code with the actual value.
      // We check both the loaded env vars (from .env files) and the actual process environment
      // to support deployment platforms that inject variables directly without .env files.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    }
  }
})