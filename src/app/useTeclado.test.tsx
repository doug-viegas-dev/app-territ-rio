import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeclado } from './useTeclado'

function Tela() {
  useTeclado()
  return <input aria-label="Campo" />
}

type Ouvinte = () => void
function criarViewport(height: number, scale = 1) {
  const ouvintes: Record<string, Ouvinte[]> = {}
  return {
    height, scale,
    addEventListener: vi.fn((t: string, f: Ouvinte) => { (ouvintes[t] ??= []).push(f) }),
    removeEventListener: vi.fn((t: string, f: Ouvinte) => { ouvintes[t] = (ouvintes[t] ?? []).filter((x) => x !== f) }),
    emitir(t: string) { (ouvintes[t] ?? []).forEach((f) => f()) },
    total: () => Object.values(ouvintes).reduce((n, l) => n + l.length, 0),
  }
}

const variavel = () => document.documentElement.style.getPropertyValue('--altura-visivel')

describe('useTeclado', () => {
  const rolar = vi.fn()
  beforeEach(() => {
    vi.useFakeTimers()
    HTMLElement.prototype.scrollIntoView = rolar
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
    Reflect.deleteProperty(window, 'visualViewport')
    document.documentElement.style.removeProperty('--altura-visivel')
    delete document.documentElement.dataset.teclado
  })

  it('grava --altura-visivel com a altura do visualViewport', () => {
    const vv = criarViewport(800)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    render(<Tela />)
    vv.height = 420
    act(() => vv.emitir('resize'))
    expect(variavel()).toBe('420px')
  })

  it('não grava a altura com zoom (scale 2)', () => {
    const vv = criarViewport(800, 2)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    render(<Tela />)
    act(() => vv.emitir('resize'))
    expect(variavel()).toBe('')
  })

  it('rola o campo focado até o centro depois de 300 ms', () => {
    render(<Tela />)
    act(() => screen.getByLabelText('Campo').focus())
    expect(rolar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(300) })
    expect(rolar).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
  })

  it('marca data-teclado ao focar e limpa ao sair', () => {
    render(<Tela />)
    const campo = screen.getByLabelText('Campo')
    act(() => campo.focus())
    expect(document.documentElement.dataset.teclado).toBe('aberto')
    act(() => campo.blur())
    expect(document.documentElement.dataset.teclado).toBeUndefined()
  })

  it('remove ouvintes e a variável ao desmontar', () => {
    const vv = criarViewport(500)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    const { unmount } = render(<Tela />)
    act(() => vv.emitir('resize'))
    expect(variavel()).toBe('500px')
    unmount()
    expect(vv.total()).toBe(0)
    expect(variavel()).toBe('')
  })
})

