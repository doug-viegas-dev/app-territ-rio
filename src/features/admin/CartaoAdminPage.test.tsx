import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '@/app/routes'
import type { Cartao, Quadra } from '@/domain/types'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { observarUsuario } from '@/firebase/auth'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao, observarCartoes } from '@/firebase/cards'
import { observarCasas } from '@/firebase/houses'
import { observarMembro } from '@/firebase/members'
import CartaoAdminPage from './CartaoAdminPage'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn(), sair: vi.fn(), observarUsuario: vi.fn() }))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn(), adicionarRua: vi.fn(), atualizarQuadra: vi.fn(), criarQuadra: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn(), observarCartoes: vi.fn(), observarEventos: vi.fn(), abrirCartaoManual: vi.fn(), fecharCartaoManual: vi.fn(), atualizarCartao: vi.fn(), cartaoTemCasas: vi.fn(), excluirCartao: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ enviarArquivosDoCartao: vi.fn(), apagarArquivos: vi.fn(), apagarArquivosDoCartao: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), fecharEReiniciarCartao: vi.fn(), recalcularContadores: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const quadras: Quadra[] = [{ id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }]

function renderPagina(papel: 'admin' | 'publicador' = 'admin') {
  vi.mocked(observarMembro).mockImplementation((_email, cb) => { cb({ papel, ativo: true, nome: 'Maria S.' }); return () => {} })
  return render(
    <MemoryRouter initialEntries={['/admin/cartao/c12']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/cartao/:cartaoId" element={<RequerMembro papel="admin"><CartaoAdminPage /></RequerMembro>} />
          <Route path="/admin" element={<p>Lista de cartões</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CartaoAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarUsuario).mockImplementation((cb) => { cb({ uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' }); return () => {} })
    vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(cartao); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb(quadras); return () => {} })
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb([cartao]); return () => {} })
    vi.mocked(observarCasas).mockImplementation((_c, _q, cb) => { cb([]); return () => {} })
  })
  afterEach(cleanup)

  it('mostra o bloco Dados do cartão, fechado, entre Estado e Quadras e ruas; Excluir cartão é o último', () => {
    renderPagina()
    const titulos = [...document.querySelectorAll('.rolagem > details.bloco > summary span')].map((e) => e.textContent)
    expect(titulos).toEqual(['Estado', 'Dados do cartão', 'Quadras e ruas', 'Histórico', 'Excluir cartão'])
    expect(screen.getByText('Dados do cartão').closest('details')).toHaveProperty('open', false)
  })

  it('mostra os três blocos', () => {
    renderPagina()
    expect(screen.getByRole('heading', { name: 'Cartão 12', level: 1 })).toBeInTheDocument()
    const resumo = (nome: string) => screen.getByText(nome)
    expect(resumo('Estado').closest('details')).toHaveProperty('open', true)
    expect(resumo('Quadras e ruas').closest('details')).toHaveProperty('open', false)
    expect(resumo('Histórico').closest('details')).toHaveProperty('open', false)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toBeInTheDocument()
  })

  it('abre e fecha os blocos pelo resumo, que é focável por teclado', async () => {
    renderPagina()
    const user = userEvent.setup()
    const quadrasResumo = screen.getByText('Quadras e ruas')
    await user.click(quadrasResumo)
    expect(quadrasResumo.closest('details')).toHaveProperty('open', true)
    expect(screen.getByRole('button', { name: 'Editar Quadra 1' })).toBeInTheDocument()
    await user.click(quadrasResumo)
    expect(quadrasResumo.closest('details')).toHaveProperty('open', false)
  })

  it('o bloco Histórico tem o atalho para o histórico do cartão', async () => {
    renderPagina()
    await userEvent.setup().click(screen.getByText('Histórico'))
    expect(screen.getByRole('link', { name: 'Ver quando foi aberto e fechado' })).toHaveAttribute('href', '/admin/cartao/c12/historico')
  })

  it('voltar leva à lista', async () => {
    renderPagina()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Voltar para Cartões' }))
    expect(screen.getByText('Lista de cartões')).toBeInTheDocument()
  })

  it('cartão que não existe mostra a mensagem', () => {
    vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(null); return () => {} })
    renderPagina()
    expect(screen.getByText('Cartão não encontrado')).toBeInTheDocument()
  })

  it('a rota admin/cartao/:id exige administrador', () => {
    vi.mocked(observarMembro).mockImplementation((_email, cb) => { cb({ papel: 'publicador', ativo: true, nome: 'Maria S.' }); return () => {} })
    render(
      <MemoryRouter initialEntries={['/admin/cartao/c12']}>
        <AuthProvider><AppRoutes /></AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Só para administradores')).toBeInTheDocument()
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
    expect(observarCartao).not.toHaveBeenCalled()
  })
})
