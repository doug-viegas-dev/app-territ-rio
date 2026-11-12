import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartoes } from '@/firebase/cards'
import { observarMembros } from '@/firebase/members'
import AdminPage from './AdminPage'

vi.mock('@/firebase/members', () => ({ observarMembros: vi.fn(), salvarMembro: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), criarCartao: vi.fn(), atualizarCartao: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ enviarArquivosDoCartao: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: () => ({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria' }, membro: { papel: 'admin', ativo: true, nome: 'Maria' } }) }))
vi.mock('@/app/useOnline', () => ({ useOnline: () => true }))
vi.mock('@/app/Topo', () => ({ default: () => null }))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(observarMembros).mockImplementation((cb) => { cb([]); return () => {} })
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb([]); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([]); return () => {} })
  })
  afterEach(cleanup)

  it('as abas são Membros, Cartões e Histórico', () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Membros', 'Cartões', 'Histórico'])
  })

  it('abre a aba indicada em location.state.aba; sem state, Membros', () => {
    const { unmount } = render(<MemoryRouter initialEntries={[{ pathname: '/admin', state: { aba: 'cartoes' } }]}><AdminPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Cartões' })).toHaveAttribute('aria-selected', 'true')
    unmount()
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Membros' })).toHaveAttribute('aria-selected', 'true')
  })

  it('não existe mais a aba Ciclo', () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.queryByRole('tab', { name: 'Ciclo' })).not.toBeInTheDocument()
  })

  it('a aba Cartões mostra a lista e o botão Novo cartão, sem o formulário', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Cartões' }))
    expect(screen.getByRole('button', { name: 'Novo cartão' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(screen.queryByText('Quadras e ruas')).not.toBeInTheDocument()
  })
})
