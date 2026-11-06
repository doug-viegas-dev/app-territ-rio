import { useEffect, useState } from 'react'
import { useFalhaDeLeitura } from '@/app/useFalhaDeLeitura'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao } from '@/firebase/cards'
import type { Cartao, Quadra } from '@/domain/types'

/** `undefined` enquanto carrega; `null` quando o cartão não existe. */
export function useCartao(id: string): Cartao | null | undefined {
  const [atual, setAtual] = useState<{ id: string; cartao: Cartao | null } | null>(null)
  const falhar = useFalhaDeLeitura()
  useEffect(() => observarCartao(id, (cartao) => setAtual({ id, cartao }), falhar), [id, falhar])
  return atual?.id === id ? atual.cartao : undefined
}

export function useQuadras(cartaoId: string): Quadra[] {
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const falhar = useFalhaDeLeitura()
  useEffect(() => (cartaoId ? observarQuadras(cartaoId, setQuadras, falhar) : undefined), [cartaoId, falhar])
  return quadras
}
