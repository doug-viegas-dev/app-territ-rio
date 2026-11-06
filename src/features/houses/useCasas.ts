import { useEffect, useState } from 'react'
import { useFalhaDeLeitura } from '@/app/useFalhaDeLeitura'
import { observarCasas } from '@/firebase/houses'
import type { Casa } from '@/domain/types'

/** `casas` é `null` enquanto carrega. `semDados`: lista vazia vinda só do cache (sem rede não prova que a quadra está vazia). */
export function useCasasInfo(cartaoId: string, quadraId: string): { casas: Casa[] | null; semDados: boolean } {
  const [atual, setAtual] = useState<{ chave: string; casas: Casa[]; semDados: boolean } | null>(null)
  const chave = `${cartaoId}/${quadraId}`
  const falhar = useFalhaDeLeitura()
  useEffect(() => observarCasas(cartaoId, quadraId, (casas, semDados) => setAtual({ chave, casas, semDados: semDados === true }), falhar), [cartaoId, quadraId, chave, falhar])
  return atual?.chave === chave ? { casas: atual.casas, semDados: atual.semDados } : { casas: null, semDados: false }
}

/** `null` enquanto carrega. */
export function useCasas(cartaoId: string, quadraId: string): Casa[] | null {
  return useCasasInfo(cartaoId, quadraId).casas
}
