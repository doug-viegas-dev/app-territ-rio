import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarCasas } from '@/firebase/houses'
import BotaoFecharCartao from './BotaoFecharCartao'

vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ fecharCartaoManual: vi.fn() }))
vi.mock('@/firebase/rodadas', () => ({ encerrarRodada: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), fecharEReiniciarCartao: vi.fn() }))

const aberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const quadras: Quadra[] = [{ id: 'q1', rotulo: 'Quadra 1', ruas: [], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }]

function sessao(papel: 'admin' | 'publicador') {
  vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria Souza' }, membro: { papel, ativo: true, nome: 'Maria S.' } })
}

describe('BotaoFecharCartao', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(observarCasas).mockImplementation(() => () => {}) })
  afterEach(cleanup)

  it('administrador com cartão aberto vê o botão', () => {
    sessao('admin')
    render(<BotaoFecharCartao cartao={aberto} quadras={quadras} />)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toBeInTheDocument()
  })

  it('publicador, ou cartão fechado, não vê nada', () => {
    sessao('publicador')
    const { container, rerender } = render(<BotaoFecharCartao cartao={aberto} quadras={quadras} />)
    expect(container).toBeEmptyDOMElement()
    sessao('admin')
    rerender(<BotaoFecharCartao cartao={{ ...aberto, estado: 'fechado' }} quadras={quadras} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('fica desativado enquanto as quadras não chegaram', () => {
    sessao('admin')
    render(<BotaoFecharCartao cartao={aberto} quadras={null} />)
    expect(screen.getByRole('button', { name: 'Fechar cartão' })).toBeDisabled()
  })

  it('"Fechar e reiniciar" troca a folha de fechamento pela de reinício', async () => {
    sessao('admin')
    render(<BotaoFecharCartao cartao={aberto} quadras={quadras} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Fechar cartão' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Fechar cartão' })).getByRole('button', { name: 'Fechar e reiniciar' }))
    expect(screen.queryByRole('dialog', { name: 'Fechar cartão' })).not.toBeInTheDocument()
    expect(screen.getByRole('alertdialog', { name: 'Fechar e reiniciar' })).toBeInTheDocument()
  })
})
