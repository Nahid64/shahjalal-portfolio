import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// SITE_URL / BASE_PATH are set in the GitHub Actions workflow.
// Project page:  SITE_URL=https://USERNAME.github.io  BASE_PATH=/REPO
// Custom domain: SITE_URL=https://yourdomain.com      BASE_PATH=/
export default defineConfig({
  site: process.env.SITE_URL || 'https://USERNAME.github.io',
  base: process.env.BASE_PATH || '/',
  integrations: [react()],
});
