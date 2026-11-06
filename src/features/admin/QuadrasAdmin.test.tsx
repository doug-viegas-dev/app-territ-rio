import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Quadra } from '@/domain/types'
import { adicionarRua, atualizarQuadra, criarQuadra, observarQuadras } from '@/firebase/blocks'
import { observarCartoes } from '@/firebase/cards'
import QuadrasAdmin from './QuadrasAdmin'
import { ruasDoTexto } from './ruasDoTexto'

vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn(), adicionarRua: vi.fn(), atualizarQuadra: vi.fn(), criarQuadra: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const quadras: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua das Acácias'], ordem: 1 },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'], ordem: 2 },
]

describe('ruasDoTexto', () => {
  it('uma por linha, sem vazias nem repetidas', () => {
    expect(ruasDoTexto(' Rua A \n\n   \nrua a\nRua B\n')).toEqual(['Rua A', 'Rua B'])
  })
})

describe('QuadrasAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb([cartao]); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb(quadras); return () => {} })
    vi.mocked(atualizarQuadra).mockResolvedValue()
    vi.mocked(adicionarRua).mockResolvedValue()
    vi.mocked(criarQuadra).mockResolvedValue('q9')
  })
  afterEach(cleanup)

  it('edita o rótulo e as ruas (uma por linha, sem vazias nem repetidas)', async () => {
    render(<QuadrasAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Editar Quadra 2' }))
    const folha = screen.getByRole('dialog', { name: 'Editar quadra' })
    const nome = within(folha).getByLabelText('Nome da quadra')
    await user.clear(nome)
    await user.type(nome, 'Quadra Dois')
    const ruas = within(folha).getByLabelText('Ruas')
    await user.clear(ruas)
    await user.type(ruas, 'Rua A{Enter}{Enter}rua a{Enter}  Rua B  ')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(atualizarQuadra).toHaveBeenCalledWith('c12', 'q2', { rotulo: 'Quadra Dois', ruas: ['Rua A', 'Rua B'] })
  })

  it('"Adicionar rua" escolhe a quadra, normaliza o nome e chama adicionarRua', async () => {
    render(<QuadrasAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    const folha = screen.getByRole('dialog', { name: 'Nova rua' })
    await user.click(within(folha).getByRole('radio', { name: 'Quadra 2' }))
    await user.type(within(folha).getByLabelText('Nome da rua'), '  Rua das Palmeiras ')
    await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
    expect(adicionarRua).toHaveBeenCalledWith('c12', 'q2', 'Rua das Palmeiras')
  })

  it('rua repetida na quadra não chama adicionarRua', async () => {
    render(<QuadrasAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    const folha = screen.getByRole('dialog', { name: 'Nova rua' })
    await user.type(within(folha).getByLabelText('Nome da rua'), 'rua das acácias')
    await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
    expect(adicionarRua).not.toHaveBeenCalled()
    expect(within(folha).getByRole('alert')).toBeInTheDocument()
  })

  it('"Adicionar quadra" cria a quadra sem ruas', async () => {
    render(<QuadrasAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }))
    const folha = screen.getByRole('dialog', { name: 'Nova quadra' })
    await user.type(within(folha).getByLabelText('Nome da quadra'), 'Quadra 5')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(criarQuadra).toHaveBeenCalledWith('c12', { rotulo: 'Quadra 5', ruas: [] })
  })
})
