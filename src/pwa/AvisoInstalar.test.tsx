import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AvisoInstalar from './AvisoInstalar'
import { reiniciarInstalacao } from './useInstalacao'

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'

function usarUA(ua: string, standalone = false) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
  Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true })
}

function eventoDeInstalacao() {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
}

const renderAviso = () => render(<MemoryRouter><AvisoInstalar /></MemoryRouter>)

describe('AvisoInstalar', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarInstalacao()
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'standalone')
  })

  it('iPhone fora do modo standalone mostra "Ver como"', () => {
    usarUA(UA_IPHONE)
    renderAviso()
    expect(screen.getByText('Instale o app no celular')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver como' })).toHaveAttribute('href', '/instalar')
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })

  it('iPhone em modo standalone não mostra o aviso', () => {
    usarUA(UA_IPHONE, true)
    renderAviso()
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
  })

  it('iPhone fora do Safari não mostra o aviso', () => {
    usarUA(UA_IPHONE.replace('Version/17.0', 'CriOS/126.0'))
    renderAviso()
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
  })

  it('dispensar esconde o aviso e lembra a escolha', async () => {
    usarUA(UA_IPHONE)
    const { unmount } = renderAviso()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dispensar aviso' }))
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
    unmount()
    renderAviso()
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
  })

  it('não quebra se o localStorage lançar erro', async () => {
    usarUA(UA_IPHONE)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    renderAviso()
    expect(screen.getByText('Instale o app no celular')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dispensar aviso' }))
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
  })

  it('Android com beforeinstallprompt mostra "Instalar app" e o toque chama prompt()', async () => {
    usarUA(UA_ANDROID)
    renderAviso()
    const evento = eventoDeInstalacao()
    act(() => { window.dispatchEvent(evento) })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar app' }))
    expect(evento.prompt).toHaveBeenCalledTimes(1)
  })

  it('Android sem o evento não mostra o botão', () => {
    usarUA(UA_ANDROID)
    renderAviso()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
    expect(screen.queryByText('Instale o app no celular')).not.toBeInTheDocument()
  })

  it('appinstalled esconde o aviso', () => {
    usarUA(UA_ANDROID)
    renderAviso()
    act(() => { window.dispatchEvent(eventoDeInstalacao()) })
    expect(screen.getByRole('button', { name: 'Instalar app' })).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })
})
