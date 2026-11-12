import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { abrirCartaoManual, observarCartao } from '@/firebase/cards'
import { observarQuadras } from '@/firebase/blocks'
import { quadraDe } from '@/firebase/converters'
import { urlDaImagem } from '@/firebase/storage'
import type { Cartao, Quadra } from '@/domain/types'
import CartaoPage from './CartaoPage'

vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn(), abrirCartaoManual: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ urlDaImagem: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const cartaoBase: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim das Acácias', estado: 'aberto', ciclo: 1, totalCasas: 30, resolvidas: 12, atualizadoEm: 0 }
const quadras: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua B'], ordem: 2, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
]
const comContadores: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1, totalCasas: 10, faltam: 4, rodadasTotal: 1, rodadaAtual: { id: 'r1', numero: 1, porNome: 'João', em: 1 } },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua B'], ordem: 2, totalCasas: 8, faltam: 0, rodadasTotal: 1 },
  { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua C'], ordem: 3, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
  { id: 'q4', rotulo: 'Quadra 4', ruas: ['Rua D'], ordem: 4, totalCasas: 5, faltam: -2, rodadasTotal: 0 },
]

function preparar(cartao: Cartao | null | 'carregando', lista: Quadra[] = quadras, papel: 'admin' | 'publicador' = 'publicador') {
  vi.mocked(observarCartao).mockImplementation((_id, cb) => {
    if (cartao !== 'carregando') cb(cartao)
    return () => {}
  })
  vi.mocked(observarQuadras).mockImplementation((_id, cb) => {
    cb(lista)
    return () => {}
  })
  vi.mocked(useSessao).mockReturnValue({
    carregando: false,
    usuario: { uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' },
    membro: { papel, ativo: true, nome: 'Maria S.' },
  })
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/cartao/c12']}>
      <Routes>
        <Route path="/cartao/:cartaoId" element={<CartaoPage />} />
        <Route path="/cartao/:cartaoId/quadra/:quadraId" element={<p>Tela da quadra</p>} />
        <Route path="/" element={<p>Lista de cartões</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CartaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(urlDaImagem).mockResolvedValue('https://exemplo.test/mapa.webp')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('mostra título e número do cartão', () => {
    preparar(cartaoBase)
    renderPagina()
    expect(screen.getByRole('heading', { level: 1, name: 'Cartão 12' })).toBeInTheDocument()
    expect(screen.getByText(/Jardim das Acácias/)).toBeInTheDocument()
    expect(screen.getByText(/12 de 30 casas/)).toBeInTheDocument()
  })

  it('mostra o link "Abrir no Google Maps" só quando há mapsUrl', () => {
    preparar({ ...cartaoBase, mapsUrl: 'https://maps.example/12' })
    renderPagina()
    const link = screen.getByRole('link', { name: 'Abrir no Google Maps' })
    expect(link).toHaveAttribute('href', 'https://maps.example/12')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    cleanup()
    preparar(cartaoBase)
    renderPagina()
    expect(screen.queryByRole('link', { name: 'Abrir no Google Maps' })).not.toBeInTheDocument()
  })

  it('lista as quadras com rótulo e navega ao tocar', async () => {
    preparar(cartaoBase)
    renderPagina()
    expect(screen.getByRole('link', { name: /Quadra 1/ })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('link', { name: /Quadra 2/ }))
    expect(screen.getByText('Tela da quadra')).toBeInTheDocument()
  })

  it('lista só as quadras com casas para visitar, com N para visitar', () => {
    preparar(cartaoBase, comContadores)
    renderPagina()
    expect(screen.getByRole('link', { name: /Quadra 1/ })).toHaveTextContent('4 para visitar')
    expect(screen.queryByRole('link', { name: /Quadra 2/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Quadra 4/ })).not.toBeInTheDocument()
  })

  it('quadra vazia continua aparecendo', () => {
    preparar(cartaoBase, comContadores)
    renderPagina()
    expect(screen.getByRole('link', { name: /Quadra 3/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quadra 3/ })).not.toHaveTextContent('para visitar')
  })

  it('quadra antiga sem contadores continua aparecendo', () => {
    // Documento gravado antes dos contadores: o conversor preenche zeros.
    const antiga = quadraDe('q9', { rotulo: 'Quadra 9', ruas: ['Rua Z'], ordem: 9 })
    preparar(cartaoBase, [antiga, comContadores[1]])
    renderPagina()
    const link = screen.getByRole('link', { name: /Quadra 9/ })
    expect(link).toBeInTheDocument()
    expect(link).not.toHaveTextContent('NaN')
    expect(link).not.toHaveTextContent('para visitar')
  })

  it('Mostrar todas as quadras revela as demais, com contador nunca negativo, e dá para voltar', async () => {
    preparar(cartaoBase, comContadores)
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getByRole('button', { name: 'Mostrar todas as quadras' }))
    expect(screen.getByRole('link', { name: /Quadra 2/ })).toHaveTextContent('0 para visitar')
    expect(screen.getByRole('link', { name: /Quadra 4/ })).toHaveTextContent('0 para visitar')
    await user.click(screen.getByRole('button', { name: 'Mostrar só as que faltam' }))
    expect(screen.queryByRole('link', { name: /Quadra 2/ })).not.toBeInTheDocument()
  })

  it('mostra a etiqueta Volta aberta só na quadra com volta aberta', () => {
    preparar(cartaoBase, comContadores)
    renderPagina()
    expect(screen.getByRole('link', { name: /Quadra 1/ })).toHaveTextContent('Volta aberta')
    expect(screen.getByRole('link', { name: /Quadra 3/ })).not.toHaveTextContent('Volta aberta')
  })

  it('cartão sem quadras mostra "Nenhuma quadra ainda"', () => {
    preparar(cartaoBase, [])
    renderPagina()
    expect(screen.getByText('Nenhuma quadra ainda')).toBeInTheDocument()
  })

  it('cartão aberto mostra quem abriu e quando', () => {
    preparar({ ...cartaoBase, abertoPorNome: 'Maria S.', abertoEm: new Date(2026, 10, 2, 9, 30).getTime() })
    renderPagina()
    expect(screen.getByText('Aberto por Maria S. em 02/11/2026')).toBeInTheDocument()
    expect(screen.queryByText('Cartão fechado')).not.toBeInTheDocument()
  })

  it('cartão fechado mostra o aviso "Cartão fechado"', () => {
    preparar({ ...cartaoBase, estado: 'fechado', resolvidas: 30 })
    renderPagina()
    expect(screen.getByText('Cartão fechado')).toBeInTheDocument()
  })

  it('publicador vê a orientação e nenhum botão de abrir', () => {
    preparar({ ...cartaoBase, estado: 'fechado' }, quadras, 'publicador')
    renderPagina()
    expect(screen.getByText('Só um administrador pode abrir o cartão. Peça a um deles.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir cartão' })).not.toBeInTheDocument()
  })

  it('admin abre o cartão depois de confirmar, com o usuário registrado', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 6, 14, 20) })
    vi.mocked(abrirCartaoManual).mockResolvedValue()
    const cartao: Cartao = { ...cartaoBase, estado: 'fechado' }
    preparar(cartao, quadras, 'admin')
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    const folha = screen.getByRole('dialog', { name: 'Abrir cartão' })
    expect(folha).toHaveTextContent('Fica registrado que foi você, Maria S., em 06/11/2026 às 14:20.')
    expect(abrirCartaoManual).not.toHaveBeenCalled()
    await user.click(screen.getAllByRole('button', { name: 'Abrir cartão' }).at(-1)!)
    expect(abrirCartaoManual).toHaveBeenCalledWith(cartao, { uid: 'u1', nome: 'Maria S.' }, quadras)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('com as quadras ainda carregando, Abrir cartão fica desativado e não abre', async () => {
    const cartao: Cartao = { ...cartaoBase, estado: 'fechado' }
    preparar(cartao, quadras, 'admin')
    vi.mocked(observarQuadras).mockImplementation(() => () => {})
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    const confirmar = screen.getAllByRole('button', { name: 'Abrir cartão' }).at(-1)!
    expect(confirmar).toBeDisabled()
    await user.click(confirmar)
    expect(abrirCartaoManual).not.toHaveBeenCalled()
  })

  it('cancelar a abertura não chama abrirCartaoManual', async () => {
    preparar({ ...cartaoBase, estado: 'fechado' }, quadras, 'admin')
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(abrirCartaoManual).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('imagem do cartão amplia e fecha', async () => {
    preparar({ ...cartaoBase, imagemPath: 'cards/c12/mapa.webp' })
    const user = userEvent.setup()
    renderPagina()
    const abrir = await screen.findByRole('button', { name: 'Ampliar o mapa do cartão 12' })
    expect(urlDaImagem).toHaveBeenCalledWith('cards/c12/mapa.webp')
    await user.click(abrir)
    const cheia = screen.getByRole('dialog', { name: 'Mapa do cartão 12' })
    expect(cheia.querySelector('img')).toHaveAttribute('src', 'https://exemplo.test/mapa.webp')
    await user.click(screen.getByRole('button', { name: 'Fechar mapa' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem imagemPath não mostra mapa', () => {
    preparar(cartaoBase)
    renderPagina()
    expect(screen.queryByRole('button', { name: /Ampliar o mapa/ })).not.toBeInTheDocument()
    expect(urlDaImagem).not.toHaveBeenCalled()
  })

  it('carregando mostra o esqueleto; cartão inexistente avisa', () => {
    preparar('carregando')
    renderPagina()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    cleanup()
    preparar(null)
    renderPagina()
    expect(screen.getByText('Cartão não encontrado')).toBeInTheDocument()
  })

  it('sem internet mostra a faixa de aviso', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    preparar(cartaoBase)
    renderPagina()
    expect(screen.getByText('Sem internet — suas anotações serão enviadas depois.')).toBeInTheDocument()
  })
})
