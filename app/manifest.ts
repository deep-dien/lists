import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lists',
    short_name: 'Lists',
    description: 'Lists',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icons/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
