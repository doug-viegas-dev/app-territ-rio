import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, EventoCartao } from '@/domain/types'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { observarUsuario } from '@/firebase/auth'
import { observarCartoes, observarEventos } from '@/firebase/cards'
import { observarMembro } from '@/firebase/members'
import HistoricoCartaoPage from './HistoricoCartaoPage'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn(), sair: vi.fn(), observarUsuario: vi.fn() }))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), observarEventos: vi.fn() }))

const cartao = (id: string, numero: string, titulo: string): Cartao => ({ id, numero, titulo, estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 })
const cartoes = [cartao('c12', '12', 'Jardim das Acácias'), cartao('c5', '5', 'Parque Ipê')]

const em = (dia: number, h: number, m: number) => new Date(2026, 9, dia, h, m).getTime()
const dezEventos: EventoCartao[] = Array.from({ length: 10 }, (_, i) => ({
  id: `e${i}`,
  tipo: i % 2 === 0 ? 'aberto' : 'fechado',
  motivo: i % 2 === 0 ? 'abertura' : 'fechamento_manual',
  em: em(30 - i, 9, 14),
  porUid: 'u1',
  porNome: 'Maria S.',
}))

function renderPagina(papel: 'admin' | 'publicador' = 'admin', protegido = true) {
  vi.mocked(observarMembro).mockImplementation((_email, cb) => { cb({ papel, ativo: true, nome: 'Maria S.' }); return () => {} })
  const pagina = <HistoricoCartaoPage />
  return render(
    <MemoryRouter initialEntries={['/admin/cartao/c12/historico']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/cartao/:cartaoId/historico" element={protegido ? <RequerMembro papel="admin">{pagina}</RequerMembro> : pagina} />
          <Route path="/admin" element={<p>Administração</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('HistoricoCartaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarUsuario).mockImplementation((cb) => { cb({ uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' }); return () => {} })
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb(cartoes); return () => {} })
    vi.mocked(observarEventos).mockImplementation((_id, cb) => { cb(dezEventos); return () => {} })
  })
  afterEach(cleanup)

  it('mostra o título, o aviso e 10 eventos na ordem recebida', () => {
    renderPagina()
    expect(screen.getByRole('heading', { name: 'Histórico', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Mostra quem abriu ou fechou o cartão e quando. Só os últimos 10 registros aparecem.')).toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Eventos do cartão' })).getAllByRole('listitem')
    expect(itens).toHaveLength(10)
    expect(within(itens[0]).getByText('Aberto')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Fechado')).toBeInTheDocument()
    expect(within(itens[0]).getByText('30/10/2026 · 09:14')).toBeInTheDocument()
    expect(within(itens[0]).getByText('Maria S. abriu o cartão')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Maria S. fechou manualmente')).toBeInTheDocument()
  })

  it('começa pelo cartão da rota e troca de cartão pelos chips', async () => {
    renderPagina()
    expect(observarEventos).toHaveBeenLastCalledWith('c12', expect.any(Function))
    await userEvent.setup().click(screen.getByRole('radio', { name: '5' }))
    expect(observarEventos).toHaveBeenLastCalledWith('c5', expect.any(Function))
    expect(screen.getByRole('radio', { name: '5' })).toHaveAttribute('aria-checked', 'true')
  })

  it('lista vazia mostra o texto de vazio', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => { cb([]); return () => {} })
    renderPagina()
    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument()
    expect(screen.getByText('Este cartão ainda não foi fechado nem reaberto.')).toBeInTheDocument()
  })

  it('carregando mostra o esqueleto', () => {
    vi.mocked(observarEventos).mockImplementation(() => () => {})
    renderPagina()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum registro ainda')).not.toBeInTheDocument()
  })

  it('publicador fora de RequerMembro não vê a página', () => {
    renderPagina('publicador', false)
    expect(screen.getByText('Só para administradores')).toBeInTheDocument()
    expect(observarEventos).not.toHaveBeenCalled()
  })
})
