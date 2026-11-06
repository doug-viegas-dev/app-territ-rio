import { useEffect, useState } from 'react'
import { useFalhaDeLeitura } from '@/app/useFalhaDeLeitura'
import { observarCartoes } from '@/firebase/cards'
import type { Cartao } from '@/domain/types'

/** `null` enquanto carrega. */
export function useCartoes(): Cartao[] | null {
  const [cartoes, setCartoes] = useState<Cartao[] | null>(null)
  const falhar = useFalhaDeLeitura()
  useEffect(() => observarCartoes(setCartoes, falhar), [falhar])
  return cartoes
}
