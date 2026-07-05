'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })

    const replay = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage('replay')
      })
    }

    window.addEventListener('online', replay)
    return () => window.removeEventListener('online', replay)
  }, [])

  return null
}
