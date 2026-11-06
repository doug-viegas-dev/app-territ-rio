import { useSyncExternalStore } from 'react'

function assinar(aviso: () => void): () => void {
  window.addEventListener('online', aviso)
  window.addEventListener('offline', aviso)
  return () => {
    window.removeEventListener('online', aviso)
    window.removeEventListener('offline', aviso)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(assinar, () => navigator.onLine, () => true)
}
