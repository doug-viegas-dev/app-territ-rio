import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Casa, Quadra } from '@/domain/types'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { observarUsuario } from '@/firebase/auth'
import { observarQuadras } from '@/firebase/blocks'
import { abrirCartaoManual, fecharCartaoManual } from '@/firebase/cards'
import { fecharEReiniciarCartao, observarCasas, recalcularContadores } from '@/firebase/houses'
import { observarMembro } from '@/firebase/members'
import CicloAdmin from './CicloAdmin'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn(), sair: vi.fn(), observarUsuario: vi.fn() }))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ abrirCartaoManual: vi.fn(), fecharCartaoManual: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), fecharEReiniciarCartao: vi.fn(), recalcularContadores: vi.fn() }))

const aberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 1, atualizadoEm: 0 }
const fechado: Cartao = { ...aberto, estado: 'fechado', ciclo: 3, resolvidas: 3 }
const quadras: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua B'], ordem: 2, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
]
const casasPorQuadra: Record<string, Casa[]> = {
  q1: [
    { id: 'h1', quadraId: 'q1', rua: 'Rua A', numero: '1', ordem: 1, status: 'falado', criadoEm: 0 },
    { id: 'h2', quadraId: 'q1', rua: 'Rua A', numero: '2', ordem: 2, status: 'nao_visitar', criadoEm: 0 },
  ],
  q2: [{ id: 'h3', quadraId: 'q2', rua: 'Rua B', numero: '3', ordem: 1, status: 'estudo', criadoEm: 0 }],
}

function renderCiclo(cartao: Cartao, papel: 'admin' | 'publicador' = 'admin') {
  vi.mocked(observarMembro).mockImplementation((_email, cb) => { cb({ papel, ativo: true, nome: 'Maria S.' }); return () => {} })
  return render(
    <MemoryRouter>
      <AuthProvider><RequerMembro papel="admin"><CicloAdmin cartao={cartao} /></RequerMembro></AuthProvider>
    </MemoryRouter>,
  )
}

describe('CicloAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarUsuario).mockImplementation((cb) => { cb({ uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' }); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb(quadras); return () => {} })
    vi.mocked(observarCasas).mockImplementation((_c, q, cb) => { cb(casasPorQuadra[q]); return () => {} })
    vi.mocked(abrirCartaoManual).mockResolvedValue()
    vi.mocked(fecharCartaoManual).mockResolvedValue()
    vi.mocked(fecharEReiniciarCartao).mockResolvedValue()
    vi.mocked(recalcularContadores).mockResolvedValue()
  })
  afterEach(cleanup)

  it('com cartão aberto, só "Fechar cartão" está ativo; "Abrir cartão" fica desativado com a nota', () => {
    renderCiclo(aberto)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: 'Abrir cartão' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Abrir só fica disponível com o cartão fechado/)).toBeInTheDocument()
    expect(screen.getByText(/ciclo 2/)).toBeInTheDocument()
  })

  it('com cartão fechado, só "Abrir cartão" está ativo', () => {
    renderCiclo(fechado)
    expect(screen.getByRole('button', { name: 'Abrir cartão' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('desativado não faz nada ao clicar', async () => {
    renderCiclo(aberto)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir cartão' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrirCartaoManual).not.toHaveBeenCalled()
  })

  it('abrir chama abrirCartaoManual com o usuário só depois da confirmação', async () => {
    renderCiclo(fechado)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    expect(abrirCartaoManual).not.toHaveBeenCalled()
    const folha = screen.getByRole('dialog', { name: 'Abrir cartão' })
    await user.click(within(folha).getByRole('button', { name: 'Abrir cartão' }))
    expect(abrirCartaoManual).toHaveBeenCalledWith(fechado, { uid: 'u1', nome: 'Maria S.' })
  })

  it('fechar chama fecharCartaoManual com o usuário', async () => {
    renderCiclo(aberto)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar cartão' }))
    expect(fecharCartaoManual).toHaveBeenCalledWith(aberto, { uid: 'u1', nome: 'Maria S.' }, quadras)
  })

  it('"Reiniciar território" não reinicia sem marcar a caixa', async () => {
    renderCiclo(aberto)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reiniciar território' }))
    const folha = screen.getByRole('alertdialog', { name: 'Reiniciar território' })
    expect(within(folha).getByText(/Esta ação não tem desfazer/)).toBeInTheDocument()
    const confirmar = within(folha).getByRole('button', { name: 'Reiniciar território' })
    expect(confirmar).toHaveAttribute('aria-disabled', 'true')
    await user.click(confirmar)
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('confirmando, reinicia com as casas de todas as quadras e o usuário', async () => {
    renderCiclo(aberto)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reiniciar território' }))
    const folha = screen.getByRole('alertdialog', { name: 'Reiniciar território' })
    await user.click(within(folha).getByRole('checkbox', { name: 'Entendo que o cartão começa um novo ciclo.' }))
    await user.click(within(folha).getByRole('button', { name: 'Reiniciar território' }))
    expect(fecharEReiniciarCartao).toHaveBeenCalledWith(aberto, [...casasPorQuadra.q1, ...casasPorQuadra.q2], quadras, { uid: 'u1', nome: 'Maria S.' })
  })

  it('cancelar fecha a confirmação sem reiniciar', async () => {
    renderCiclo(aberto)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reiniciar território' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('não reinicia com casas faltando (quadra ainda não carregada)', async () => {
    vi.mocked(observarCasas).mockImplementation((_c, q, cb) => { if (q === 'q1') cb(casasPorQuadra.q1); return () => {} })
    renderCiclo(aberto)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reiniciar território' }))
    const folha = screen.getByRole('alertdialog', { name: 'Reiniciar território' })
    expect(within(folha).getByText(/ainda estamos carregando todas as casas/)).toBeInTheDocument()
    await user.click(within(folha).getByRole('checkbox', { name: 'Entendo que o cartão começa um novo ciclo.' }))
    await user.click(within(folha).getByRole('button', { name: 'Reiniciar território' }))
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('avisa quando os contadores parecem errados', () => {
    renderCiclo({ ...aberto, resolvidas: 5 })
    expect(screen.getByText('Os contadores parecem errados')).toBeInTheDocument()
  })

  it('não avisa de contadores quando estão coerentes', () => {
    renderCiclo(aberto)
    expect(screen.queryByText('Os contadores parecem errados')).not.toBeInTheDocument()
  })

  it('recalcular chama recalcularContadores', async () => {
    renderCiclo(aberto)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recalcular contadores' }))
    expect(recalcularContadores).toHaveBeenCalledWith('c12')
  })

  it('o link do histórico aponta para a rota do cartão', () => {
    renderCiclo(aberto)
    expect(screen.getByRole('link', { name: 'Ver quando foi aberto e fechado' })).toHaveAttribute('href', '/admin/cartao/c12/historico')
  })

  it('publicador não vê os botões', () => {
    renderCiclo(aberto, 'publicador')
    expect(screen.queryByRole('button', { name: 'Fechar cartão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reiniciar território' })).not.toBeInTheDocument()
  })
})
