import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Casa, Quadra } from '@/domain/types'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { observarUsuario } from '@/firebase/auth'
import { abrirCartaoManual, fecharCartaoManual } from '@/firebase/cards'
import { fecharEReiniciarCartao, observarCasas, recalcularContadores } from '@/firebase/houses'
import { observarMembro } from '@/firebase/members'
import EstadoCartao from './EstadoCartao'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn(), sair: vi.fn(), observarUsuario: vi.fn() }))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ abrirCartaoManual: vi.fn(), fecharCartaoManual: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), fecharEReiniciarCartao: vi.fn(), recalcularContadores: vi.fn() }))

const aberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 1, atualizadoEm: 0 }
const fechado: Cartao = { ...aberto, estado: 'fechado', ciclo: 3, resolvidas: 3 }
const quadras: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua B'], ordem: 2, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
]
const comRodadaAberta: Quadra[] = [{ ...quadras[0], rodadaAtual: { id: 'r1', numero: 1, porNome: 'Maria S.', em: 1 } }, quadras[1]]
const casasPorQuadra: Record<string, Casa[]> = {
  q1: [
    { id: 'h1', quadraId: 'q1', rua: 'Rua A', numero: '1', ordem: 1, status: 'falado', criadoEm: 0 },
    { id: 'h2', quadraId: 'q1', rua: 'Rua A', numero: '2', ordem: 2, status: 'nao_visitar', criadoEm: 0 },
  ],
  q2: [{ id: 'h3', quadraId: 'q2', rua: 'Rua B', numero: '3', ordem: 1, status: 'estudo', criadoEm: 0 }],
}
const usuario = { uid: 'u1', nome: 'Maria S.' }
const AVISO = 'Encerre as rodadas abertas antes de fechar.'

const arvore = (cartao: Cartao, qs: Quadra[] | null) => (
  <MemoryRouter>
    <AuthProvider><RequerMembro papel="admin"><EstadoCartao cartao={cartao} quadras={qs} /></RequerMembro></AuthProvider>
  </MemoryRouter>
)

function renderEstado(cartao: Cartao, qs: Quadra[] | null = quadras, papel: 'admin' | 'publicador' = 'admin') {
  vi.mocked(observarMembro).mockImplementation((_email, cb) => { cb({ papel, ativo: true, nome: 'Maria S.' }); return () => {} })
  return render(arvore(cartao, qs))
}

async function abrirReinicio(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Fechar e reiniciar' }))
  return screen.getByRole('alertdialog', { name: 'Fechar e reiniciar' })
}

describe('EstadoCartao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarUsuario).mockImplementation((cb) => { cb({ uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' }); return () => {} })
    vi.mocked(observarCasas).mockImplementation((_c, q, cb) => { cb(casasPorQuadra[q]); return () => {} })
    vi.mocked(abrirCartaoManual).mockResolvedValue()
    vi.mocked(fecharCartaoManual).mockResolvedValue()
    vi.mocked(fecharEReiniciarCartao).mockResolvedValue()
    vi.mocked(recalcularContadores).mockResolvedValue()
  })
  afterEach(cleanup)

  it('Fechar cartão grava fechamento manual sem subir o ciclo', async () => {
    renderEstado(aberto)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).not.toHaveAttribute('aria-disabled')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar cartão' }))
    expect(fecharCartaoManual).toHaveBeenCalledWith(aberto, usuario, quadras)
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('Fechar e reiniciar confirma e deixa o cartão fechado', async () => {
    renderEstado(aberto)
    const user = userEvent.setup()
    const folha = await abrirReinicio(user)
    expect(within(folha).getByText(/Esta ação não tem desfazer/)).toBeInTheDocument()
    expect(within(folha).getByText(/exceto 1 marcada como/)).toBeInTheDocument()
    expect(within(folha).getByText(/O cartão fica/)).toHaveTextContent('O cartão fica fechado')
    const confirmar = within(folha).getByRole('button', { name: 'Fechar e reiniciar' })
    expect(confirmar).toHaveAttribute('aria-disabled', 'true')
    await user.click(confirmar)
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
    await user.click(within(folha).getByRole('checkbox', { name: 'Entendo que o cartão volta ao início.' }))
    await user.click(within(folha).getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(fecharEReiniciarCartao).toHaveBeenCalledWith(aberto, [...casasPorQuadra.q1, ...casasPorQuadra.q2], quadras, usuario)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('com a folha aberta, uma rodada aberta depois bloqueia a confirmação e mostra o aviso', async () => {
    const { rerender } = renderEstado(aberto)
    const user = userEvent.setup()
    const folha = await abrirReinicio(user)
    await user.click(within(folha).getByRole('checkbox', { name: 'Entendo que o cartão volta ao início.' }))
    expect(within(folha).queryByText(AVISO)).not.toBeInTheDocument()
    rerender(arvore(aberto, comRodadaAberta))
    const confirmar = within(screen.getByRole('alertdialog', { name: 'Fechar e reiniciar' })).getByRole('button', { name: 'Fechar e reiniciar' })
    expect(confirmar).toHaveAttribute('aria-disabled', 'true')
    expect(within(screen.getByRole('alertdialog')).getByText(AVISO)).toBeInTheDocument()
    await user.click(confirmar)
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('cancelar fecha a confirmação sem reiniciar', async () => {
    renderEstado(aberto)
    const user = userEvent.setup()
    await abrirReinicio(user)
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('não reinicia com casas faltando (quadra ainda não carregada)', async () => {
    vi.mocked(observarCasas).mockImplementation((_c, q, cb) => { if (q === 'q1') cb(casasPorQuadra.q1); return () => {} })
    renderEstado(aberto)
    const user = userEvent.setup()
    const folha = await abrirReinicio(user)
    expect(within(folha).getByText(/ainda estamos carregando todas as casas/)).toBeInTheDocument()
    await user.click(within(folha).getByRole('checkbox', { name: 'Entendo que o cartão volta ao início.' }))
    await user.click(within(folha).getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('Fechar e Fechar e reiniciar ficam desativados com rodada aberta e mostram o aviso', async () => {
    renderEstado(aberto, comRodadaAberta)
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Fechar e reiniciar' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar cartão' }))
    await user.click(screen.getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fecharCartaoManual).not.toHaveBeenCalled()
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('sem rodada aberta não mostra o aviso', () => {
    renderEstado(aberto)
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it('com as quadras ainda carregando, não fecha nem reinicia e avisa', async () => {
    renderEstado(aberto, null)
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Fechar e reiniciar' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Aguarde: ainda estamos carregando as quadras do cartão.')).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar cartão' }))
    await user.click(screen.getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fecharCartaoManual).not.toHaveBeenCalled()
    expect(fecharEReiniciarCartao).not.toHaveBeenCalled()
  })

  it('com cartão fechado, Fechar cartão fica desativado e Fechar e reiniciar continua disponível', () => {
    renderEstado(fechado)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Fechar e reiniciar' })).not.toHaveAttribute('aria-disabled')
  })

  it('Abrir cartão só com cartão fechado', async () => {
    const { unmount } = renderEstado(aberto)
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: 'Abrir cartão' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Abrir só fica disponível com o cartão fechado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    renderEstado(fechado)
    await user.click(screen.getByRole('button', { name: 'Abrir cartão' }))
    expect(abrirCartaoManual).not.toHaveBeenCalled()
    const folha = screen.getByRole('dialog', { name: 'Abrir cartão' })
    await user.click(within(folha).getByRole('button', { name: 'Abrir cartão' }))
    expect(abrirCartaoManual).toHaveBeenCalledWith(fechado, usuario, quadras)
  })

  it('contadores suspeitos mostram o aviso', () => {
    renderEstado({ ...aberto, resolvidas: 5 })
    expect(screen.getByText('Os contadores parecem errados')).toBeInTheDocument()
  })

  it('não avisa de contadores quando estão coerentes', () => {
    renderEstado(aberto)
    expect(screen.queryByText('Os contadores parecem errados')).not.toBeInTheDocument()
  })

  it('quadra sem contadores mostra o aviso para recalcular', () => {
    renderEstado(aberto, [{ ...quadras[0], semContadores: true }, quadras[1]])
    const aviso = screen.getByText('Recalcule os contadores: algumas quadras ainda não têm a contagem de casas.')
    expect(aviso.closest('[role="status"]')).not.toBeNull()
  })

  it('quadra com contagem impossível mostra o aviso de recalcular', () => {
    renderEstado(aberto, [{ ...quadras[0], totalCasas: 3, faltam: 5 }, quadras[1]])
    expect(screen.getByText(/Recalcule os contadores/).closest('[role="status"]')).not.toBeNull()
  })

  it('quadra com contagem impossível e outra sem contadores mostram um aviso só', () => {
    renderEstado(aberto, [{ ...quadras[0], totalCasas: 3, faltam: 5 }, { ...quadras[1], semContadores: true }])
    expect(screen.getAllByText(/Recalcule os contadores/)).toHaveLength(1)
    expect(screen.getByText(/Recalcule os contadores/).closest('[role="status"]')).not.toBeNull()
  })

  it('sem quadras sem contadores não mostra o aviso de recalcular', () => {
    renderEstado(aberto)
    expect(screen.queryByText(/Recalcule os contadores/)).not.toBeInTheDocument()
  })

  it('o aviso de rodada aberta diz em quais quadras, na tela e na confirmação', async () => {
    const duas: Quadra[] = [comRodadaAberta[0], { ...quadras[1], rodadaAtual: { id: 'r9', numero: 2, porNome: 'Ana', em: 1 } }]
    const { rerender } = renderEstado(aberto)
    const folha = await abrirReinicio(userEvent.setup())
    rerender(arvore(aberto, duas))
    expect(screen.getAllByText('Rodada aberta em: Quadra 1, Quadra 2.')).toHaveLength(2)
    expect(within(folha).getByText('Rodada aberta em: Quadra 1, Quadra 2.')).toBeInTheDocument()
  })

  it('recalcular chama recalcularContadores', async () => {
    renderEstado(aberto)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recalcular contadores' }))
    expect(recalcularContadores).toHaveBeenCalledWith('c12')
  })

  it('não existe mais a ação "Reiniciar território" nem o nome de seção "Ciclo"', () => {
    renderEstado(aberto)
    expect(screen.queryByRole('button', { name: 'Reiniciar território' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Ciclo/ })).not.toBeInTheDocument()
  })

  it('publicador não vê os botões', () => {
    renderEstado(aberto, quadras, 'publicador')
    expect(screen.queryByRole('button', { name: 'Fechar cartão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fechar e reiniciar' })).not.toBeInTheDocument()
  })
})
