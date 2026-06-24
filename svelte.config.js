import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    preprocess: vitePreprocess({ scss: true }),

    compilerOptions: {
        customElement: true,
        // Enable compatibility mode to keep Svelte 4 syntax working
        compatibility: {
            componentApi: 4
        }
    },
}