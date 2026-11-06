import { useEffect, useState } from 'react'
import { observarCasas } from '@/firebase/houses'
import type { Casa } from '@/domain/types'

/** `null` enquanto carrega. */
export function useCasas(cartaoId: string, quadraId: string): Casa[] | null {
  const [atual, setAtual] = useState<{ chave: string; casas: Casa[] } | null>(null)
  const chave = `${cartaoId}/${quadraId}`
  useEffect(() => observarCasas(cartaoId, quadraId, (casas) => setAtual({ chave, casas })), [cartaoId, quadraId, chave])
  return atual?.chave === chave ? atual.casas : null
}
