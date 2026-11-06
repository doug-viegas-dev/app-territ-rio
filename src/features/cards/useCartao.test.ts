import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { observarQuadras } from '@/firebase/blocks'
import { useQuadras } from './useCartao'

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
