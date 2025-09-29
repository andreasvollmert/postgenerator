import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY),
        'process.env.USE_OPENROUTER': JSON.stringify((process.env.USE_OPENROUTER || env.USE_OPENROUTER) === 'true'),
        'process.env.SITE_PASSWORD': JSON.stringify(process.env.SITE_PASSWORD || env.SITE_PASSWORD),
        'process.env.NANO_BANANA_API_KEY': JSON.stringify(process.env.NANO_BANANA_API_KEY || env.NANO_BANANA_API_KEY),
        'process.env.REPLICATE_API_TOKEN': JSON.stringify(process.env.REPLICATE_API_TOKEN || env.REPLICATE_API_TOKEN),
        'process.env.WORDPRESS_API_URL': JSON.stringify(process.env.WORDPRESS_API_URL || env.WORDPRESS_API_URL),
        'process.env.WORDPRESS_USERNAME': JSON.stringify(process.env.WORDPRESS_USERNAME || env.WORDPRESS_USERNAME),
        'process.env.WORDPRESS_APP_PASSWORD': JSON.stringify(process.env.WORDPRESS_APP_PASSWORD || env.WORDPRESS_APP_PASSWORD),
        'process.env.ENABLE_VIDEO_GENERATION': JSON.stringify((process.env.ENABLE_VIDEO_GENERATION || env.ENABLE_VIDEO_GENERATION) === 'true'),
        'process.env.ENABLE_WORDPRESS_EXPORT': JSON.stringify((process.env.ENABLE_WORDPRESS_EXPORT || env.ENABLE_WORDPRESS_EXPORT) === 'true'),
        'process.env.ENABLE_PASSWORD_PROTECTION': JSON.stringify((process.env.ENABLE_PASSWORD_PROTECTION || env.ENABLE_PASSWORD_PROTECTION) === 'true')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            login: path.resolve(__dirname, 'login.html')
          }
        }
      }
    };
});
