// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { reactCompilerPreset } from '@vitejs/plugin-react';

// https://astro.build/config
export default defineConfig({
  site: 'https://azhukau.com',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [react(), sitemap()],
  session: false,
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Schibsted Grotesk',
      cssVariable: '--font-schibsted',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
  vite: {
    // React Compiler memoizes components automatically: https://react.dev/learn/react-compiler
    plugins: [tailwindcss(), babel({ presets: [reactCompilerPreset()] })],
  },
});
