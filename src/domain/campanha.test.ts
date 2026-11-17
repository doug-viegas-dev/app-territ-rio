import { describe, expect, it } from 'vitest'
import { estadoDaCasa, guardarCasa, resultadosDisponiveis, RESULTADOS_PADRAO, situacaoDaCampanha, validarCampanha } from './campanha'
import { podeAbrirRodada } from './rodada'
import { rotuloResultado, rotuloStatus } from './rotulos'

describe('campanha', () => {
  it('sem campanha oferece os quatro resultados; com campanha, só os escolhidos', () => {
    expect(resultadosDisponiveis(null)).toEqual(RESULTADOS_PADRAO)
    expect(resultadosDisponiveis({ resultados: ['carta', 'falado'] })).toEqual(['falado', 'carta'])
  })

  it('valida nome e ao menos um resultado', () => {
    expect(validarCampanha({ nome: '  ', resultados: ['falado'] })).toBeTruthy()
    expect(validarCampanha({ nome: 'Convites', resultados: [] })).toBeTruthy()
    expect(validarCampanha({ nome: 'Convites', resultados: ['falado', 'carta'] })).toBeNull()
  })

  it('guarda só casas fora de Pendente e restaura (ou zera) o estado', () => {
    expect(guardarCasa('c', 'q', { status: 'pendente' })).toBeNull()
    const g = guardarCasa('c', 'q', { status: 'falado', ultimaVisitaEm: 5, ultimoPor: 'Ana' })
    expect(g).toEqual({ cartaoId: 'c', quadraId: 'q', status: 'falado', ultimaVisitaEm: 5, ultimoPor: 'Ana' })
    expect(estadoDaCasa(g ?? undefined)).toMatchObject({ status: 'falado', ultimaVisitaEm: 5, ultimoPor: 'Ana' })
    expect(estadoDaCasa(undefined)).toEqual({ status: 'pendente' })
  })

  it('na campanha cada quadra tem uma volta só', () => {
    expect(podeAbrirRodada({ rodadasTotal: 0 }, true)).toBe(true)
    expect(podeAbrirRodada({ rodadasTotal: 1 }, true)).toBe(false)
    expect(podeAbrirRodada({ rodadasTotal: 1 })).toBe(true)
    expect(podeAbrirRodada({ rodadasTotal: 0, rodadaAtual: { id: 'r', numero: 1, porNome: 'x', em: 0 } }, true)).toBe(false)
  })

  it('a Carta vira "Convite deixado" na campanha', () => {
    expect(rotuloStatus('carta')).toBe('Carta')
    expect(rotuloResultado('carta', true)).toBe('Convite deixado')
    expect(rotuloResultado('carta', false)).toBe('Carta')
    expect(rotuloResultado('falado', true)).toBe('Conversado')
  })

  it('situação em palavras', () => {
    expect(situacaoDaCampanha({ fase: 'ativa' })).toBe('Em andamento')
  })
})
