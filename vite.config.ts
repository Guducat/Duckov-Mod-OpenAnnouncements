import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { codecovVitePlugin } from '@codecov/vite-plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const codecovToken = process.env.CODECOV_TOKEN;
    const enableCodecovBundleAnalysis = Boolean(codecovToken && codecovToken.length > 0);
    const bundleName =
      process.env.CODECOV_BUNDLE_NAME ??
      process.env.npm_package_name ??
      'duckov-mod-open-announcements';
    return {
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Put the Codecov vite plugin after all other plugins
        codecovVitePlugin({
          enableBundleAnalysis: enableCodecovBundleAnalysis,
          bundleName,
          uploadToken: codecovToken,
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
