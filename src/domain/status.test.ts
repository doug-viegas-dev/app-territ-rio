import { describe, expect, it } from 'vitest'
import { contaNoTotal, contribuicao, deltaContadores, faltaVisitar, isResolvida } from './status'

describe('status', () => {
  it('contribuicao de cada status', () => {
    expect(contribuicao({ status: 'falado' })).toEqual({ total: 1, resolvidas: 1, faltam: 0 })
    expect(contribuicao({ status: 'carta' })).toEqual({ total: 1, resolvidas: 1, faltam: 0 })
    for (const status of ['sem_resposta', 'nao_em_casa', 'pendente'] as const) {
      expect(contribuicao({ status })).toEqual({ total: 1, resolvidas: 0, faltam: 1 })
    }
    expect(contribuicao({ status: 'falado', naoVisitar: true })).toEqual({ total: 0, resolvidas: 0, faltam: 0 })
    expect(contribuicao(null)).toEqual({ total: 0, resolvidas: 0, faltam: 0 })
  })
  it('deltaContadores', () => {
    expect(deltaContadores({ status: 'falado' }, { status: 'falado', naoVisitar: true })).toEqual({ total: -1, resolvidas: -1, faltam: 0 })
    expect(deltaContadores({ status: 'pendente' }, { status: 'pendente', naoVisitar: true })).toEqual({ total: -1, resolvidas: 0, faltam: -1 })
    expect(deltaContadores({ status: 'pendente' }, { status: 'carta' })).toEqual({ total: 0, resolvidas: 1, faltam: -1 })
    expect(deltaContadores(null, { status: 'sem_resposta' })).toEqual({ total: 1, resolvidas: 0, faltam: 1 })
    expect(deltaContadores({ status: 'carta' }, null)).toEqual({ total: -1, resolvidas: -1, faltam: 0 })
  })
  it('isResolvida, faltaVisitar e contaNoTotal', () => {
    expect(isResolvida({ status: 'falado' })).toBe(true)
    expect(isResolvida({ status: 'carta' })).toBe(true)
    expect(isResolvida({ status: 'nao_em_casa' })).toBe(false)
    expect(isResolvida({ status: 'falado', naoVisitar: true })).toBe(false)
    expect(faltaVisitar({ status: 'nao_em_casa' })).toBe(true)
    expect(faltaVisitar({ status: 'pendente', naoVisitar: true })).toBe(false)
    expect(contaNoTotal({})).toBe(true)
    expect(contaNoTotal({ naoVisitar: true })).toBe(false)
  })
})
