import { describe, expect, it } from 'vitest'
import { aindaNoHistorico, vencimentoDoRegistro } from './historico'

describe('historico', () => {
  it('vencimento soma 2 anos de calendário', () => {
    expect(vencimentoDoRegistro(new Date(2026, 10, 12, 9).getTime())).toBe(new Date(2028, 10, 12, 9).getTime())
  })
  it('registro com mais de 2 anos sai do histórico', () => {
    expect(aindaNoHistorico({ em: new Date(2024, 10, 12).getTime() }, new Date(2026, 10, 13).getTime())).toBe(false)
  })
  it('expiraEm no futuro fica; igual a agora sai', () => {
    const agora = new Date(2026, 10, 13).getTime()
    expect(aindaNoHistorico({ em: 0, expiraEm: agora + 1 }, agora)).toBe(true)
    expect(aindaNoHistorico({ em: 0, expiraEm: agora }, agora)).toBe(false)
  })
  it('sem expiraEm usa em + 2 anos', () => {
    expect(aindaNoHistorico({ em: new Date(2025, 0, 1).getTime() }, new Date(2026, 10, 13).getTime())).toBe(true)
  })
})
