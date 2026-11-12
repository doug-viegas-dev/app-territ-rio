import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { casaDe, eventoDe, quadraDe, rodadaDe, visitaDe } from './converters'

describe('conversores', () => {
  it('quadraDe sem campos novos usa zero e sem rodada atual', () => {
    const q = quadraDe('b1', { rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1 })
    expect(q).toMatchObject({ totalCasas: 0, faltam: 0, rodadasTotal: 0 })
    expect(q.rodadaAtual).toBeUndefined()
    expect('rodadaAtual' in q).toBe(false)
  })

  it('quadraDe lê rodadaAtual completa', () => {
    const q = quadraDe('b1', {
      rotulo: 'Quadra 1', ruas: [], ordem: 1, totalCasas: 10, faltam: 4, rodadasTotal: 2,
      rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em: Timestamp.fromMillis(5000) },
    })
    expect(q).toMatchObject({ totalCasas: 10, faltam: 4, rodadasTotal: 2, rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em: 5000 } })
  })

  it('quadraDe marca semContadores quando falta totalCasas ou faltam', () => {
    expect(quadraDe('b1', { rotulo: 'Quadra 1', ruas: [], ordem: 1 }).semContadores).toBe(true)
    expect(quadraDe('b1', { totalCasas: 3 }).semContadores).toBe(true)
    expect(quadraDe('b1', { faltam: 2 }).semContadores).toBe(true)
    expect(quadraDe('b1', { totalCasas: '3', faltam: 1 }).semContadores).toBe(true)
    const completa = quadraDe('b1', { totalCasas: 0, faltam: 0 })
    expect(completa.semContadores).toBeFalsy()
    expect('semContadores' in completa).toBe(false)
  })

  it('quadraDe ignora rodadaAtual inválida', () => {
    expect(quadraDe('b1', { rodadaAtual: 'x' }).rodadaAtual).toBeUndefined()
    expect(quadraDe('b1', { rodadaAtual: { numero: 1 } }).rodadaAtual).toBeUndefined()
  })

  it('visitaDe devolve rodada quando numérica', () => {
    expect(visitaDe('v1', { rodada: 3 }).rodada).toBe(3)
    expect('rodada' in visitaDe('v1', {})).toBe(false)
  })

  it('casaDe converte status legados em pendente mais marca', () => {
    expect(casaDe('c1', 'b1', { status: 'estudo' })).toMatchObject({ status: 'pendente', estudo: true })
    const n = casaDe('c1', 'b1', { status: 'nao_visitar' })
    expect(n).toMatchObject({ status: 'pendente', naoVisitar: true })
    expect('estudo' in n).toBe(false)
  })

  it('casaDe lê status novos e marcas', () => {
    const c = casaDe('c1', 'b1', { status: 'carta', naoVisitar: true, naoVisitarPor: 'Ana', naoVisitarEm: Timestamp.fromMillis(900) })
    expect(c).toMatchObject({ status: 'carta', naoVisitar: true, naoVisitarPor: 'Ana', naoVisitarEm: 900 })
    expect(casaDe('c1', 'b1', { status: 'nao_em_casa', estudo: true, estudoPor: 'Bia', estudoEm: Timestamp.fromMillis(7) }))
      .toMatchObject({ status: 'nao_em_casa', estudo: true, estudoPor: 'Bia', estudoEm: 7 })
    expect(casaDe('c1', 'b1', { status: 'qualquer' }).status).toBe('pendente')
    const sem = casaDe('c1', 'b1', { status: 'falado' })
    expect('naoVisitar' in sem).toBe(false)
    expect('estudo' in sem).toBe(false)
  })

  it('visitaDe sem status é observação; mantém status antigo e expiraEm', () => {
    const o = visitaDe('v1', { obs: 'voltar', em: Timestamp.fromMillis(1), porUid: 'u', porNome: 'Ana', ciclo: 1 })
    expect('status' in o).toBe(false)
    expect(o.obs).toBe('voltar')
    expect(visitaDe('v2', { status: 'estudo' }).status).toBe('estudo')
    expect(visitaDe('v3', { status: 'nao_visitar' }).status).toBe('nao_visitar')
    expect(visitaDe('v4', { status: 'carta', expiraEm: Timestamp.fromMillis(99) }).expiraEm).toBe(99)
    expect('expiraEm' in visitaDe('v5', {})).toBe(false)
  })

  it('eventoDe aceita tipo rodada', () => {
    const e = eventoDe('e1', { tipo: 'rodada', motivo: 'rodada_aberta', em: Timestamp.fromMillis(7), porUid: 'u', porNome: 'Ana', quadraId: 'b1', quadraRotulo: 'Quadra 1', rodada: 2 })
    expect(e).toMatchObject({ tipo: 'rodada', motivo: 'rodada_aberta', em: 7, quadraId: 'b1', quadraRotulo: 'Quadra 1', rodada: 2 })
    expect('quadraId' in eventoDe('e2', { tipo: 'fechado' })).toBe(false)
  })

  it('rodadaDe lê abertura e encerramento', () => {
    const r = rodadaDe('r1', { numero: 1, abertaPorUid: 'u', abertaPorNome: 'Ana', abertaEm: Timestamp.fromMillis(10), encerradaPorUid: 'v', encerradaPorNome: 'Bia', encerradaEm: Timestamp.fromMillis(20) })
    expect(r).toEqual({ id: 'r1', numero: 1, abertaPorUid: 'u', abertaPorNome: 'Ana', abertaEm: 10, encerradaPorUid: 'v', encerradaPorNome: 'Bia', encerradaEm: 20 })
    expect(rodadaDe('r2', { numero: 2, abertaPorUid: 'u', abertaPorNome: 'Ana', abertaEm: Timestamp.fromMillis(10) }).encerradaEm).toBeUndefined()
  })
})
