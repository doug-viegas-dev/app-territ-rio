import { useEffect, useState } from 'react'
import { observarSincronizando } from '@/firebase/sincronia'

export function useSincronizando(): boolean {
  const [pendente, setPendente] = useState(false)
  useEffect(() => observarSincronizando(setPendente), [])
  return pendente
}
