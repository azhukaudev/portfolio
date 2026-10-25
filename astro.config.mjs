// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://azhukau.com',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [sitemap()],
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
