import type { Casa } from '@/domain/types'

/** Vizinhas da casa na nova posição, contadas depois de tirar a casa movida da lista. */
export function destinoDoMovimento(ruaCasas: Casa[], casaId: string, novoIndice: number): { antes: Casa | null; depois: Casa | null } {
  const resto = ruaCasas.filter((c) => c.id !== casaId)
  const i = Math.max(0, Math.min(novoIndice, resto.length))
  return { antes: resto[i - 1] ?? null, depois: resto[i] ?? null }
}
