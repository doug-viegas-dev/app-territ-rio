import { describe, expect, it } from 'vitest'
import { podeAbrirRodada, podeEncerrarRodada, podeFecharCartao, podeRegistrarNaQuadra, proximoNumeroRodada, quadrasComRodadaAberta, quadrasParaVisitar, rodadaDeOutroDia } from './rodada'

const rodadaAtual = { id: 'r1', numero: 1, porNome: 'Ana', em: new Date(2026, 10, 8, 10).getTime() }

describe('rodada', () => {
  it('só abre rodada quando não há uma aberta, e só encerra quando há', () => {
    expect(podeAbrirRodada({})).toBe(true)
    expect(podeAbrirRodada({ rodadaAtual })).toBe(false)
    expect(podeEncerrarRodada({})).toBe(false)
    expect(podeEncerrarRodada({ rodadaAtual })).toBe(true)
  })
  it('calcula o próximo número', () => {
    expect(proximoNumeroRodada({ rodadasTotal: 2 })).toBe(3)
  })
  it('registrar exige cartão aberto e rodada aberta', () => {
    expect(podeRegistrarNaQuadra({ estado: 'aberto' }, { rodadaAtual })).toBe(true)
    expect(podeRegistrarNaQuadra({ estado: 'fechado' }, { rodadaAtual })).toBe(false)
    expect(podeRegistrarNaQuadra({ estado: 'aberto' }, {})).toBe(false)
  })
  it('detecta rodada aberta em outro dia local', () => {
    expect(rodadaDeOutroDia(rodadaAtual, new Date(2026, 10, 8, 23, 59).getTime())).toBe(false)
    expect(rodadaDeOutroDia(rodadaAtual, new Date(2026, 10, 9, 0, 1).getTime())).toBe(true)
  })
  it('filtra quadras com rodada aberta e impede fechar o cartão com alguma', () => {
    const qs = [{ id: 'a' }, { id: 'b', rodadaAtual }]
    expect(quadrasComRodadaAberta(qs)).toEqual([qs[1]])
    expect(podeFecharCartao(qs)).toBe(false)
    expect(podeFecharCartao([{}, {}])).toBe(true)
  })
  it('quadrasParaVisitar mantém quadra vazia ou com casas faltando', () => {
    const vazia = { totalCasas: 0, faltam: 0 }
    const faltando = { totalCasas: 5, faltam: 1 }
    expect(quadrasParaVisitar([vazia, faltando, { totalCasas: 5, faltam: 0 }])).toEqual([vazia, faltando])
  })
  it('quadrasParaVisitar mantém quadra sem contadores e quadra com rodada aberta, mesmo com faltam 0', () => {
    const semContadores = { totalCasas: 1, faltam: 0, semContadores: true }
    const comRodada = { totalCasas: 5, faltam: 0, rodadaAtual }
    const pronta = { totalCasas: 5, faltam: 0 }
    expect(quadrasParaVisitar([semContadores, comRodada, pronta])).toEqual([semContadores, comRodada])
  })
})
