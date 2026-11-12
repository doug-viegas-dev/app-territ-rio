import { podeFecharCartao } from './rodada'
import type { Cartao, Quadra } from './types'

export type MotivoBloqueio = 'aberto' | 'volta' | 'casas'

export class ExclusaoBloqueada extends Error {
  constructor(readonly motivo: MotivoBloqueio) {
    super(`Exclusão bloqueada: ${motivo}`)
    this.name = 'ExclusaoBloqueada'
  }
}

export function bloqueiosDoCartao(c: Pick<Cartao, 'estado'>, quadras: Pick<Quadra, 'rodadaAtual'>[]): ('aberto' | 'volta')[] {
  const r: ('aberto' | 'volta')[] = []
  if (c.estado === 'aberto') r.push('aberto')
  if (!podeFecharCartao(quadras)) r.push('volta')
  return r
}

export function bloqueioDaQuadra(q: Pick<Quadra, 'rodadaAtual'>): 'volta' | null {
  return q.rodadaAtual ? 'volta' : null
}

export const TEXTOS_BLOQUEIO = {
  'cartao.aberto': 'Feche o cartão para excluir.',
  'cartao.volta': 'Encerre as voltas abertas antes.',
  'cartao.casas': 'Este cartão tem casas. Só é possível excluir um cartão vazio.',
  'quadra.volta': 'Encerre a volta aberta antes.',
  'quadra.casas': 'Esta quadra tem casas. Só é possível excluir uma quadra vazia.',
  'rua.casas': 'Esta rua tem casas. Mude ou exclua as casas antes.',
} as const
