import { describe, expect, it } from 'vitest'
import { deltaResolvidas, isResolvida } from './status'

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
})
