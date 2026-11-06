import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reiniciarInstalacao, useInstalacao } from './useInstalacao'

function eventoDeInstalacao(resultado: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: resultado }),
  })
}

describe('useInstalacao', () => {
  beforeEach(reiniciarInstalacao)
  afterEach(reiniciarInstalacao)

  it('sem o evento do Chrome não pode instalar', () => {
    const { result } = renderHook(() => useInstalacao())
    expect(result.current.podeInstalar).toBe(false)
    expect(result.current.instalado).toBe(false)
  })

  it('guarda o evento, impede o aviso padrão e chama prompt() ao instalar', async () => {
    const { result } = renderHook(() => useInstalacao())
    const evento = eventoDeInstalacao()
    act(() => { window.dispatchEvent(evento) })
    expect(evento.defaultPrevented).toBe(true)
    expect(result.current.podeInstalar).toBe(true)

    let resposta: string | undefined
    await act(async () => { resposta = await result.current.instalar() })
    expect(evento.prompt).toHaveBeenCalledTimes(1)
    expect(resposta).toBe('accepted')
    expect(result.current.podeInstalar).toBe(false)
  })

  it('appinstalled marca como instalado', () => {
    const { result } = renderHook(() => useInstalacao())
    act(() => { window.dispatchEvent(eventoDeInstalacao()) })
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(result.current.instalado).toBe(true)
    expect(result.current.podeInstalar).toBe(false)
  })

  it('lembra do evento mesmo que ele chegue antes da tela montar', () => {
    window.dispatchEvent(eventoDeInstalacao())
    const { result } = renderHook(() => useInstalacao())
    expect(result.current.podeInstalar).toBe(true)
  })

  it('instalar sem evento não faz nada', async () => {
    const { result } = renderHook(() => useInstalacao())
    let resposta: string | undefined
    await act(async () => { resposta = await result.current.instalar() })
    expect(resposta).toBe('dismissed')
  })
})
