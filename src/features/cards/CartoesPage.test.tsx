import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { observarCartoes } from '@/firebase/cards'
import type { Cartao } from '@/domain/types'
import CartoesPage from './CartoesPage'

vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))

const cartao = (p: Partial<Cartao>): Cartao => ({
  id: 'c1', numero: '12', titulo: 'Jardim das Acácias', estado: 'aberto', ciclo: 1, totalCasas: 30, resolvidas: 12, atualizadoEm: 0, ...p,
})

function entregar(lista: Cartao[] | 'carregando') {
  vi.mocked(observarCartoes).mockImplementation((cb) => {
    if (lista !== 'carregando') cb(lista)
    return () => {}
  })
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CartoesPage />} />
        <Route path="/cartao/:cartaoId" element={<p>Tela do cartão</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CartoesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
  })
  afterEach(cleanup)

  it('mostra "Em andamento" antes de "Fechados"', () => {
    entregar([cartao({}), cartao({ id: 'c2', numero: '5', titulo: 'Parque Ipê', estado: 'fechado', resolvidas: 28, totalCasas: 28 })])
    renderPagina()
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos[0]).toMatch(/^Em andamento/)
    expect(titulos[1]).toMatch(/^Fechados/)
  })

  it('exibe resolvidas/totalCasas e navega para o cartão', async () => {
    entregar([cartao({})])
    renderPagina()
    expect(screen.getByText('12/30')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('link', { name: /Jardim das Acácias/ }))
    expect(screen.getByText('Tela do cartão')).toBeInTheDocument()
  })

  it('cartão com 0 casas mostra 0/0 e barra em 0%, sem dividir por zero', () => {
    entregar([cartao({ totalCasas: 0, resolvidas: 0 })])
    renderPagina()
    expect(screen.getByText('0/0')).toBeInTheDocument()
    const barra = screen.getByRole('progressbar')
    expect(barra).toHaveAttribute('aria-valuenow', '0')
    expect(barra.querySelector('b')).toHaveStyle({ width: '0%' })
  })

  it('lista vazia mostra "Nenhum cartão ainda"', () => {
    entregar([])
    renderPagina()
    expect(screen.getByText('Nenhum cartão ainda')).toBeInTheDocument()
  })

  it('sem internet mostra a faixa de aviso', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    entregar([cartao({})])
    renderPagina()
    expect(screen.getByText('Sem internet — suas anotações serão enviadas depois.')).toBeInTheDocument()
  })

  it('com internet não mostra a faixa de aviso', () => {
    entregar([cartao({})])
    renderPagina()
    expect(screen.queryByText(/Sem internet/)).not.toBeInTheDocument()
  })

  it('carregando mostra o esqueleto, sem texto de erro nem lista vazia', () => {
    entregar('carregando')
    renderPagina()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum cartão ainda')).not.toBeInTheDocument()
    expect(screen.queryByText(/erro|não foi possível/i)).not.toBeInTheDocument()
  })
})
