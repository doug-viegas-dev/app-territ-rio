import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from './useOnline'

describe('useOnline', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reage aos eventos offline e online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current).toBe(false)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(result.current).toBe(true)
  })
})
