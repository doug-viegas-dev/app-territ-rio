import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstalarPage from './InstalarPage'
import { reiniciarInstalacao } from './useInstalacao'

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'

function eventoDeInstalacao() {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
}

const renderPagina = () => render(
  <MemoryRouter initialEntries={['/instalar']}>
    <Routes>
      <Route path="/" element={<p>Tela inicial</p>} />
      <Route path="/instalar" element={<InstalarPage />} />
    </Routes>
  </MemoryRouter>,
)

describe('InstalarPage', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarInstalacao()
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('Android com o evento: botão instala com um toque', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_ANDROID)
    renderPagina()
    const evento = eventoDeInstalacao()
    act(() => { window.dispatchEvent(evento) })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar app' }))
    expect(evento.prompt).toHaveBeenCalledTimes(1)
  })

  it('Android sem o evento: sem botão, com o caminho pelo menu do Chrome', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_ANDROID)
    renderPagina()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
    expect(screen.getByText('O botão não funcionou?')).toBeInTheDocument()
    expect(screen.getByText(/três pontos/)).toBeInTheDocument()
  })

  it('depois de appinstalled mostra "App instalado"', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_ANDROID)
    renderPagina()
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(screen.getByRole('heading', { name: 'App instalado' })).toBeInTheDocument()
    expect(screen.getByText(/Procure o ícone/)).toBeInTheDocument()
    expect(screen.queryByText('O botão não funcionou?')).not.toBeInTheDocument()
  })

  it('iPhone no Safari mostra o passo a passo', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_IPHONE)
    renderPagina()
    expect(screen.getByText('Compartilhar')).toBeInTheDocument()
    expect(screen.getByText('Adicionar à Tela de Início')).toBeInTheDocument()
    expect(screen.getByText('Adicionar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })

  it('iPhone fora do Safari pede para abrir no Safari', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_IPHONE.replace('Version/17.0', 'CriOS/126.0'))
    renderPagina()
    expect(screen.queryByText('Adicionar à Tela de Início')).not.toBeInTheDocument()
    expect(screen.getByText(/abra .* no Safari/i)).toBeInTheDocument()
  })

  it('"Agora não" lembra a escolha e volta para a lista', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_IPHONE)
    renderPagina()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Agora não' }))
    expect(screen.getByText('Tela inicial')).toBeInTheDocument()
    expect(localStorage.getItem('instalar-dispensado')).toBe('1')
  })
})
