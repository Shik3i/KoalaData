import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
		runes: true
	},

	kit: {
		adapter: adapter(),
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'font-src': ['self'],
				'img-src': ['self', 'data:'],
				'connect-src': ['self'],
				'frame-ancestors': ['none'],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		}
	}
};

export default config;
