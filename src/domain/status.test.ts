import { describe, expect, it } from 'vitest'
import { deltaFaltam, deltaResolvidas, faltaVisitar, isResolvida } from './status'

describe('status', () => {
  it('identifica casas resolvidas', () => {
    expect(['falado', 'estudo', 'nao_visitar'].map((s) => isResolvida(s as Parameters<typeof isResolvida>[0]))).toEqual([true, true, true])
    expect(isResolvida('pendente')).toBe(false)
    expect(isResolvida('sem_resposta')).toBe(false)
  })
  it('calcula a variação de resolvidas', () => {
    expect(deltaResolvidas('pendente', 'falado')).toBe(1)
    expect(deltaResolvidas('falado', 'sem_resposta')).toBe(-1)
    expect(deltaResolvidas('falado', 'estudo')).toBe(0)
  })
  it('faltaVisitar é verdadeiro só para pendente e sem_resposta', () => {
    expect((['pendente', 'sem_resposta', 'falado', 'estudo', 'nao_visitar'] as const).map(faltaVisitar)).toEqual([true, true, false, false, false])
  })
  it('calcula a variação de faltam', () => {
    expect(deltaFaltam('pendente', 'falado')).toBe(-1)
    expect(deltaFaltam('falado', 'sem_resposta')).toBe(1)
    expect(deltaFaltam('pendente', 'sem_resposta')).toBe(0)
  })
})
