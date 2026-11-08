import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, EventoCartao } from '@/domain/types'
import { observarCartoes, observarEventos } from '@/firebase/cards'
import HistoricoAdmin from './HistoricoAdmin'

vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), observarEventos: vi.fn() }))

const cartao = (id: string, numero: string, titulo: string): Cartao => ({ id, numero, titulo, estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 })
const cartoes = [cartao('c12', '12', 'Jardim'), cartao('c5', '5', 'Parque Ipê')]
const em = (dia: number, h: number, m: number) => new Date(2026, 9, dia, h, m).getTime()
const ev = (id: string, p: Partial<EventoCartao>): EventoCartao => ({ id, tipo: 'aberto', motivo: 'abertura', em: 0, porUid: 'u1', porNome: 'Maria S.', ...p })
const eventosPor: Record<string, EventoCartao[]> = {
  c12: [ev('a', { em: em(20, 9, 14) }), ev('b', { tipo: 'fechado', motivo: 'fechamento_manual', em: em(10, 8, 0) })],
  c5: [ev('c', { tipo: 'rodada', motivo: 'rodada_aberta', quadraRotulo: 'Quadra A', rodada: 2, em: em(25, 18, 30) })],
}

function renderHistorico() {
  return render(<MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/admin" element={<HistoricoAdmin />} />
      <Route path="/admin/cartao/:cartaoId/historico" element={<p>Histórico do cartão</p>} />
    </Routes>
  </MemoryRouter>)
}

describe('HistoricoAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb(cartoes); return () => {} })
    vi.mocked(observarEventos).mockImplementation((id, cb) => { cb(eventosPor[id] ?? []); return () => {} })
  })
  afterEach(cleanup)

  it('junta os eventos de todos os cartões, do mais recente para o mais antigo', () => {
    renderHistorico()
    const itens = within(screen.getByRole('list', { name: 'Eventos de todos os cartões' })).getAllByRole('listitem')
    expect(itens).toHaveLength(3)
    expect(itens[0]).toHaveTextContent('Cartão 5')
    expect(within(itens[0]).getByText('Rodada aberta')).toBeInTheDocument()
    expect(within(itens[0]).getByText('Maria S. abriu a rodada 2 da Quadra A')).toBeInTheDocument()
    expect(within(itens[0]).getByText(/25\/10\/2026 · 18:30/)).toBeInTheDocument()
    expect(itens[1]).toHaveTextContent('Cartão 12')
    expect(within(itens[1]).getByText('Aberto')).toBeInTheDocument()
    expect(within(itens[2]).getByText('Fechado')).toBeInTheDocument()
    expect(screen.queryByText(/Só os últimos 10/)).not.toBeInTheDocument()
  })

  it('o seletor filtra por cartão', async () => {
    renderHistorico()
    const seletor = screen.getByLabelText('Cartão')
    expect(within(seletor).getByRole('option', { name: 'Todos os cartões' })).toBeInTheDocument()
    await userEvent.setup().selectOptions(seletor, 'c12')
    const itens = within(screen.getByRole('list', { name: 'Eventos de todos os cartões' })).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    itens.forEach((i) => expect(i).toHaveTextContent('Cartão 12'))
  })

  it('tocar num item abre o histórico do cartão', async () => {
    renderHistorico()
    const link = screen.getAllByRole('link')[0]
    expect(link).toHaveAttribute('href', '/admin/cartao/c5/historico')
    await userEvent.setup().click(link)
    expect(screen.getByText('Histórico do cartão')).toBeInTheDocument()
  })

  it('sem eventos mostra Nenhum registro ainda', () => {
    vi.mocked(observarEventos).mockImplementation((_id, cb) => { cb([]); return () => {} })
    renderHistorico()
    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument()
  })

  it('carregando mostra o esqueleto e não o vazio', () => {
    vi.mocked(observarCartoes).mockImplementation(() => () => {})
    renderHistorico()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum registro ainda')).not.toBeInTheDocument()
  })

  it('assina cada cartão uma vez e cancela ao sair', () => {
    const cancelar = vi.fn()
    vi.mocked(observarEventos).mockImplementation((id, cb) => { cb(eventosPor[id] ?? []); return cancelar })
    const { unmount } = renderHistorico()
    expect(observarEventos).toHaveBeenCalledTimes(2)
    unmount()
    expect(cancelar).toHaveBeenCalledTimes(2)
  })
})
