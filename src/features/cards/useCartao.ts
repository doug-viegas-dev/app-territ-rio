import { useEffect, useState } from 'react'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao } from '@/firebase/cards'
import type { Cartao, Quadra } from '@/domain/types'

/** `undefined` enquanto carrega; `null` quando o cartão não existe. */
export function useCartao(id: string): Cartao | null | undefined {
  const [cartao, setCartao] = useState<Cartao | null | undefined>(undefined)
  useEffect(() => {
    setCartao(undefined)
    return observarCartao(id, setCartao)
  }, [id])
  return cartao
}

export function useQuadras(cartaoId: string): Quadra[] {
  const [quadras, setQuadras] = useState<Quadra[]>([])
  useEffect(() => observarQuadras(cartaoId, setQuadras), [cartaoId])
  return quadras
}
