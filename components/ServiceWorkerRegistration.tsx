'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function ServiceWorkerRegistration() {
  const queryClient = useQueryClient()

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

    // queued mutations reached the server — refetch so temp-id optimistic
    // entries are replaced with server data
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'replayed') {
        queryClient.invalidateQueries()
      }
    }

    window.addEventListener('online', replay)
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('online', replay)
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [queryClient])

  return null
}
