import { describe, expect, it } from 'vitest'
import { bloqueioDaQuadra, bloqueiosDoCartao, ExclusaoBloqueada, TEXTOS_BLOQUEIO } from './exclusao'

const rodada = { id: 'r', numero: 1, porNome: 'Ana', em: 1 }
describe('exclusao', () => {
  it('bloqueiosDoCartao', () => {
    expect(bloqueiosDoCartao({ estado: 'aberto' }, [{}, { rodadaAtual: rodada }])).toEqual(['aberto', 'volta'])
    expect(bloqueiosDoCartao({ estado: 'fechado' }, [{}])).toEqual([])
  })
  it('bloqueioDaQuadra', () => {
    expect(bloqueioDaQuadra({ rodadaAtual: rodada })).toBe('volta')
    expect(bloqueioDaQuadra({})).toBeNull()
  })
  it('ExclusaoBloqueada', () => {
    const e = new ExclusaoBloqueada('casas')
    expect(e.motivo).toBe('casas')
    expect(e).toBeInstanceOf(Error)
  })
  it('TEXTOS_BLOQUEIO', () => {
    expect(TEXTOS_BLOQUEIO).toEqual({
      'cartao.aberto': 'Feche o cartão para excluir.',
      'cartao.volta': 'Encerre as voltas abertas antes.',
      'cartao.casas': 'Este cartão tem casas. Só é possível excluir um cartão vazio.',
      'quadra.volta': 'Encerre a volta aberta antes.',
      'quadra.casas': 'Esta quadra tem casas. Só é possível excluir uma quadra vazia.',
      'rua.casas': 'Esta rua tem casas. Mude ou exclua as casas antes.',
    })
  })
})
