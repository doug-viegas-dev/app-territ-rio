import type { Quadra } from './types'

type Par = { id: string; ordem: number }

export function trocarOrdem(quadras: Pick<Quadra, 'id' | 'ordem'>[], id: string, sentido: 'subir' | 'descer'): [Par, Par] | null {
  const lista = [...quadras].sort((a, b) => a.ordem - b.ordem)
  const i = lista.findIndex((q) => q.id === id)
  const j = sentido === 'subir' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= lista.length) return null
  return [{ id: lista[i].id, ordem: lista[j].ordem }, { id: lista[j].id, ordem: lista[i].ordem }]
}
