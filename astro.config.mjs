// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	// The dashboard fetches official gym data on every request, so it is rendered on demand.
	adapter: node({ mode: 'standalone' }),
});
