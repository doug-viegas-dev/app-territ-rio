import { useEffect, useState } from 'react'
import { observarCartoes } from '@/firebase/cards'
import type { Cartao } from '@/domain/types'

/** `null` enquanto carrega. */
export function useCartoes(): Cartao[] | null {
  const [cartoes, setCartoes] = useState<Cartao[] | null>(null)
  useEffect(() => observarCartoes(setCartoes), [])
  return cartoes
}
