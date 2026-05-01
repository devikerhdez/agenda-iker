import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'assets/Logo_app_agenda.png'],
      manifest: {
        name: 'Agenda Iker',
        short_name: 'Agenda',
        description: 'Mi Agenda Personal',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'assets/Logo_app_agenda.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/Logo_app_agenda.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'assets/Logo_app_agenda.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
