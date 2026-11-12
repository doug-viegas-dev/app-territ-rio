import { useEffect, useState } from 'react'
import { useFalhaDeLeitura } from '@/app/useFalhaDeLeitura'
import type { Casa, Quadra } from '@/domain/types'
import { observarCasas } from '@/firebase/houses'

/** Casas de todas as quadras recebidas, na ordem das quadras. */
export function useCasasDoCartao(cartaoId: string, quadras: Quadra[]): Casa[] {
  const [porQuadra, setPorQuadra] = useState<Record<string, Casa[]>>({})
  const chave = quadras.map((q) => q.id).join('|')
  const falhar = useFalhaDeLeitura()
  useEffect(() => {
    const cancelar = quadras.map((q) => observarCasas(cartaoId, q.id, (casas) => setPorQuadra((atual) => ({ ...atual, [q.id]: casas })), falhar))
    return () => cancelar.forEach((c) => c())
    // `quadras` só muda de conteúdo quando `chave` muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartaoId, chave, falhar])
  return quadras.flatMap((q) => porQuadra[q.id] ?? [])
}
