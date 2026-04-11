import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    server: {
        host: '::',
        port: 8080,
        hmr: {
            overlay: false,
        },
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'My App',
                short_name: 'MyApp',
                start_url: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: '/logo/logo-single-md.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/logo/logo-single-md.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            },
        }),
        mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
}))
