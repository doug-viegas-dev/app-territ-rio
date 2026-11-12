import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Quadra } from '@/domain/types'
import { fecharCartaoManual } from '@/firebase/cards'
import { encerrarRodada } from '@/firebase/rodadas'
import ConfirmarFechamento from './ConfirmarFechamento'

vi.mock('@/firebase/cards', () => ({ fecharCartaoManual: vi.fn() }))
vi.mock('@/firebase/rodadas', () => ({ encerrarRodada: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 3, resolvidas: 1, atualizadoEm: 0 }
const q2: Quadra = { id: 'q2', rotulo: 'Quadra 2', ruas: [], ordem: 2, totalCasas: 0, faltam: 0, rodadasTotal: 0 }
const q3: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: [], ordem: 3, totalCasas: 0, faltam: 0, rodadasTotal: 1, rodadaAtual: { id: 'r1', numero: 1, porNome: 'Ana', em: 1 } }
const usuario = { uid: 'u1', nome: 'Maria S.' }

function renderizar(quadras: Quadra[]) {
  const props = { onFechar: vi.fn(), onReiniciar: vi.fn(), onErro: vi.fn() }
  render(<ConfirmarFechamento cartao={cartao} quadras={quadras} usuario={usuario} {...props} />)
  return props
}

describe('ConfirmarFechamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fecharCartaoManual).mockResolvedValue()
    vi.mocked(encerrarRodada).mockResolvedValue()
  })
  afterEach(cleanup)

  it('sem volta aberta: fecha o cartão e fecha a folha', async () => {
    const p = renderizar([q2])
    expect(screen.getByText('Fechar o cartão 12?')).toBeInTheDocument()
    expect(screen.getByText('As voltas recomeçam na próxima abertura.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar cartão' }))
    expect(fecharCartaoManual).toHaveBeenCalledWith(cartao, usuario, [q2])
    expect(encerrarRodada).not.toHaveBeenCalled()
    expect(p.onFechar).toHaveBeenCalled()
  })

  it('"Fechar e reiniciar" chama onReiniciar', async () => {
    const p = renderizar([q2])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(p.onReiniciar).toHaveBeenCalled()
    expect(fecharCartaoManual).not.toHaveBeenCalled()
  })

  it('a folha não espera pela escrita (offline); rejeição chama onErro', async () => {
    vi.mocked(fecharCartaoManual).mockRejectedValue(new Error('x'))
    const p = renderizar([q2])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar cartão' }))
    expect(p.onFechar).toHaveBeenCalled()
    await waitFor(() => expect(p.onErro).toHaveBeenCalled())
  })

  it('com volta aberta: encerra as voltas e só depois fecha com as quadras sem rodadaAtual', async () => {
    const p = renderizar([q2, q3])
    expect(screen.getByText('Volta aberta em: Quadra 3.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fechar cartão' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Encerrar voltas e fechar' }))
    expect(encerrarRodada).toHaveBeenCalledTimes(1)
    expect(encerrarRodada).toHaveBeenCalledWith('c12', q3, usuario)
    expect(fecharCartaoManual).toHaveBeenCalledWith(cartao, usuario, [q2, { ...q3, rodadaAtual: undefined }])
    expect(vi.mocked(encerrarRodada).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fecharCartaoManual).mock.invocationCallOrder[0])
    expect(p.onFechar).toHaveBeenCalled()
  })

  it('se encerrarRodada rejeitar, não fecha o cartão e chama onErro', async () => {
    vi.mocked(encerrarRodada).mockRejectedValue(new Error('x'))
    const p = renderizar([q2, q3])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Encerrar voltas e fechar' }))
    expect(fecharCartaoManual).not.toHaveBeenCalled()
    expect(p.onErro).toHaveBeenCalled()
    expect(p.onFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível')
  })
})
