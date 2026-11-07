// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Fonts are downloaded at build time and served by the app. Japanese text (official notes)
// falls back to the system's Japanese fonts.
const japaneseFallbacks = ['Hiragino Sans', 'Noto Sans JP', 'Yu Gothic'];

// https://astro.build/config
export default defineConfig({
	// The dashboard fetches official gym data on every request, so it is rendered on demand.
	adapter: node({ mode: 'standalone' }),
	integrations: [react()],
	// English at `/`, Japanese at `/ja/`. Messages live in src/i18n.
	i18n: {
		locales: ['en', 'ja'],
		defaultLocale: 'en',
		routing: { prefixDefaultLocale: false },
	},
	vite: {
		plugins: [tailwindcss()],
	},
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Barlow Condensed',
			cssVariable: '--font-barlow-condensed',
			weights: [500, 600, 700],
			styles: ['normal'],
			fallbacks: [...japaneseFallbacks, 'sans-serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'IBM Plex Sans',
			cssVariable: '--font-ibm-plex-sans',
			weights: [400, 500, 600],
			styles: ['normal'],
			fallbacks: [...japaneseFallbacks, 'sans-serif'],
		},
	],
});
