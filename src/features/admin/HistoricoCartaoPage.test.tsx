import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, EventoCartao } from '@/domain/types'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { observarUsuario } from '@/firebase/auth'
import { editarEvento, excluirEvento, observarCartoes, observarEventos } from '@/firebase/cards'
import { observarMembro } from '@/firebase/members'
import HistoricoCartaoPage from './HistoricoCartaoPage'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn(), sair: vi.fn(), observarUsuario: vi.fn() }))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), observarEventos: vi.fn(), editarEvento: vi.fn(), excluirEvento: vi.fn() }))

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
          <Route path="/admin/cartao/:cartaoId" element={<p>Tela do cartão</p>} />
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

  it('mostra o título, o aviso sem limite de 10 e os eventos na ordem recebida', () => {
    renderPagina()
    expect(screen.getByRole('heading', { name: 'Histórico', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Mostra quem abriu ou fechou o cartão e quando\./)).toBeInTheDocument()
    expect(screen.queryByText(/Só os últimos 10/)).not.toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Eventos do cartão' })).getAllByRole('listitem')
    expect(itens).toHaveLength(10)
    expect(within(itens[0]).getByText('Aberto')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Fechado')).toBeInTheDocument()
    expect(within(itens[0]).getByText('30/10/2026 · 09:14')).toBeInTheDocument()
    expect(within(itens[0]).getByText('Maria S. abriu o cartão')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Maria S. fechou manualmente')).toBeInTheDocument()
  })

  it('não mostra mais chips de cartão', () => {
    renderPagina()
    expect(observarEventos).toHaveBeenLastCalledWith('c12', expect.any(Function))
    expect(screen.getByRole('heading', { name: 'Cartão 12 · Jardim das Acácias' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('mostra eventos de rodada com quadra e número', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([
        { id: 'r2', tipo: 'rodada', motivo: 'rodada_encerrada', quadraId: 'qa', quadraRotulo: 'Quadra A', rodada: 2, em: em(25, 18, 30), porUid: 'u2', porNome: 'João P.' },
        { id: 'r1', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'qa', quadraRotulo: 'Quadra A', rodada: 2, em: em(24, 9, 5), porUid: 'u1', porNome: 'Maria S.' },
      ])
      return () => {}
    })
    renderPagina()
    const itens = within(screen.getByRole('list', { name: 'Eventos do cartão' })).getAllByRole('listitem')
    expect(within(itens[0]).getByText('Volta encerrada')).toBeInTheDocument()
    expect(within(itens[0]).getByText('João P. encerrou a volta 2 da Quadra A')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Volta aberta')).toBeInTheDocument()
    expect(screen.queryByText('Aberto')).not.toBeInTheDocument()
    expect(screen.queryByText('Fechado')).not.toBeInTheDocument()
    const bloco = screen.getByRole('region', { name: 'Voltas por quadra' })
    expect(within(bloco).getByRole('heading', { name: 'Quadra A' })).toBeInTheDocument()
    expect(within(bloco).getByText('Volta 2')).toBeInTheDocument()
    expect(within(bloco).getByText('aberta por Maria S. em 24/10 às 09:05')).toBeInTheDocument()
    expect(within(bloco).getByText('encerrada por João P. em 25/10 às 18:30')).toBeInTheDocument()
  })

  it('duas quadras com o mesmo rótulo e quadraId diferentes ficam em grupos separados', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([
        { id: 'b1', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'qb', quadraRotulo: 'Quadra A', rodada: 1, em: em(26, 10, 0), porUid: 'u1', porNome: 'Maria S.' },
        { id: 'a1', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'qa', quadraRotulo: 'Quadra A', rodada: 1, em: em(24, 9, 5), porUid: 'u1', porNome: 'Ana P.' },
      ])
      return () => {}
    })
    renderPagina()
    const bloco = screen.getByRole('region', { name: 'Voltas por quadra' })
    expect(within(bloco).getAllByRole('heading', { name: 'Quadra A' })).toHaveLength(2)
    expect(within(bloco).getAllByText('Volta 1')).toHaveLength(2)
    expect(within(bloco).getByText('aberta por Maria S. em 26/10 às 10:00')).toBeInTheDocument()
    expect(within(bloco).getByText('aberta por Ana P. em 24/10 às 09:05')).toBeInTheDocument()
  })

  it('evento de rodada sem quadraId agrupa pelo rótulo', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([
        { id: 'r2', tipo: 'rodada', motivo: 'rodada_encerrada', quadraRotulo: 'Quadra A', rodada: 1, em: em(25, 18, 30), porUid: 'u2', porNome: 'João P.' },
        { id: 'r1', tipo: 'rodada', motivo: 'rodada_aberta', quadraRotulo: 'Quadra A', rodada: 1, em: em(24, 9, 5), porUid: 'u1', porNome: 'Maria S.' },
      ])
      return () => {}
    })
    renderPagina()
    const bloco = screen.getByRole('region', { name: 'Voltas por quadra' })
    expect(within(bloco).getAllByRole('heading', { name: 'Quadra A' })).toHaveLength(1)
    expect(within(bloco).getAllByText('Volta 1')).toHaveLength(1)
  })

  it('não mistura duas volta 1 da mesma quadra', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([
        { id: 'e4', tipo: 'rodada', motivo: 'rodada_encerrada', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 1, em: em(28, 18, 0), porUid: 'u2', porNome: 'Bia' },
        { id: 'e3', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 1, em: em(27, 9, 0), porUid: 'u1', porNome: 'Ana' },
        { id: 'e2', tipo: 'rodada', motivo: 'rodada_encerrada', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 1, em: em(20, 18, 0), porUid: 'u2', porNome: 'Caio' },
        { id: 'e1', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 1, em: em(19, 9, 0), porUid: 'u1', porNome: 'Dani' },
      ])
      return () => {}
    })
    renderPagina()
    const bloco = screen.getByRole('region', { name: 'Voltas por quadra' })
    const itens = within(bloco).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(within(itens[0]).getByText('Volta 1')).toBeInTheDocument()
    expect(within(itens[0]).getByText('aberta por Ana em 27/10 às 09:00')).toBeInTheDocument()
    expect(within(itens[0]).getByText('encerrada por Bia em 28/10 às 18:00')).toBeInTheDocument()
    expect(within(itens[1]).getByText('aberta por Dani em 19/10 às 09:00')).toBeInTheDocument()
    expect(within(itens[1]).getByText('encerrada por Caio em 20/10 às 18:00')).toBeInTheDocument()
  })

  it('volta 1 seguida de volta 2 sem encerramento mantém as duas', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([
        { id: 'e2', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 2, em: em(25, 9, 0), porUid: 'u1', porNome: 'Ana' },
        { id: 'e1', tipo: 'rodada', motivo: 'rodada_aberta', quadraId: 'q1', quadraRotulo: 'Quadra 1', rodada: 1, em: em(24, 9, 0), porUid: 'u1', porNome: 'Bia' },
      ])
      return () => {}
    })
    renderPagina()
    const itens = within(screen.getByRole('region', { name: 'Voltas por quadra' })).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(within(itens[0]).getByText('Volta 2')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Volta 1')).toBeInTheDocument()
    expect(within(itens[1]).queryByText(/encerrada por/)).not.toBeInTheDocument()
  })

  it('mostra fechou e reiniciou o território', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => {
      cb([{ id: 'f', tipo: 'fechado', motivo: 'fechamento_reinicio', em: em(26, 10, 0), porUid: 'u1', porNome: 'Maria S.' }])
      return () => {}
    })
    renderPagina()
    const item = within(screen.getByRole('list', { name: 'Eventos do cartão' })).getByRole('listitem')
    expect(within(item).getByText('Fechado')).toBeInTheDocument()
    expect(within(item).getByText('Maria S. fechou e reiniciou o território')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Voltas por quadra' })).not.toBeInTheDocument()
  })

  it('voltar leva à tela do cartão', async () => {
    renderPagina()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Voltar para o cartão' }))
    expect(screen.getByText('Tela do cartão')).toBeInTheDocument()
  })

  it('lista vazia mostra o texto de vazio', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => { cb([]); return () => {} })
    renderPagina()
    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument()
    expect(screen.getByText('Este cartão ainda não foi fechado nem reaberto.')).toBeInTheDocument()
  })

  it('edita a data e o nome de um registro', async () => {
    const user = userEvent.setup()
    vi.mocked(editarEvento).mockResolvedValue()
    renderPagina()
    await user.click(screen.getAllByRole('button', { name: /^Editar registro/ })[0])
    const quem = screen.getByLabelText('Quem fez')
    await user.clear(quem)
    await user.type(quem, 'Ana Souza')
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-10-20T08:30' } })
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(editarEvento).toHaveBeenCalledWith('c12', 'e0', { em: new Date(2026, 9, 20, 8, 30).getTime(), porNome: 'Ana Souza' })
    expect(screen.queryByRole('dialog', { name: 'Editar registro' })).not.toBeInTheDocument()
  })

  it('não salva a edição sem nome', async () => {
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getAllByRole('button', { name: /^Editar registro/ })[0])
    await user.clear(screen.getByLabelText('Quem fez'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome de quem fez.')
    expect(editarEvento).not.toHaveBeenCalled()
  })

  it('exclui um registro só depois de confirmar', async () => {
    const user = userEvent.setup()
    vi.mocked(excluirEvento).mockResolvedValue()
    renderPagina()
    await user.click(screen.getAllByRole('button', { name: /^Excluir registro/ })[1])
    expect(excluirEvento).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Excluir este registro?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Excluir registro' }))
    expect(excluirEvento).toHaveBeenCalledWith('c12', 'e1')
  })

  it('cancelar a exclusão não apaga nada', async () => {
    const user = userEvent.setup()
    renderPagina()
    await user.click(screen.getAllByRole('button', { name: /^Excluir registro/ })[0])
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(excluirEvento).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
