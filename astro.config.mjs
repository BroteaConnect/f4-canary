import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// React integration lets Astro render feature components as islands
// (client:load), so a feature's React UI is shared with the `react` stack.
export default defineConfig({
  // absolute hreflang alternates need the canonical origin
  site: 'https://f4-canary.brotea.dev',
  integrations: [react()],
});
