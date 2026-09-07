import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
    // Browser tools run outside the host network namespace. Listen on all
    // interfaces so they can reach the dev server via host.docker.internal.
    server: {
        host: '0.0.0.0',
    },
    // Keep local development HTTP by default so browsers can load localhost
    // without a self-signed certificate warning. Opt into HTTPS when needed.
    plugins: [
        react(),
        ...(process.env.VITE_DEV_HTTPS === 'true' ? [basicSsl()] : []),
    ],
})
