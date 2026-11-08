import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { observarQuadras } from '@/firebase/blocks'
import type { Quadra } from '@/domain/types'
import { useQuadras, useQuadrasCarregadas } from './useCartao'

vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn() }))

describe('useQuadras', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarQuadras).mockImplementation(() => () => {})
  })

  it('não observa nada enquanto o cartão ainda não foi escolhido (id vazio)', () => {
    const { result } = renderHook(() => useQuadras(''))
    expect(observarQuadras).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })

  it('observa as quadras do cartão informado', () => {
    renderHook(() => useQuadras('c1'))
    expect(observarQuadras).toHaveBeenCalledWith('c1', expect.any(Function), expect.any(Function))
  })
})

describe('useQuadrasCarregadas', () => {
  const q: Quadra = { id: 'q1', rotulo: 'Quadra 1', ruas: [], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }

  it('é null enquanto carrega, mesmo sem quadras, e [] quando o servidor responde vazio', () => {
    let entregar: (qs: Quadra[]) => void = () => {}
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { entregar = cb; return () => {} })
    const { result } = renderHook(() => useQuadrasCarregadas('c1'))
    expect(result.current).toBeNull()
    act(() => entregar([]))
    expect(result.current).toEqual([])
    act(() => entregar([q]))
    expect(result.current).toEqual([q])
  })

  it('volta a null ao trocar de cartão', () => {
    vi.mocked(observarQuadras).mockImplementation((id, cb) => { if (id === 'c1') cb([q]); return () => {} })
    const { result, rerender } = renderHook(({ id }) => useQuadrasCarregadas(id), { initialProps: { id: 'c1' } })
    expect(result.current).toEqual([q])
    rerender({ id: 'c2' })
    expect(result.current).toBeNull()
  })
})
