import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessao } from '@/features/auth/AuthProvider'
import { abrirRodada, encerrarRodada } from '@/firebase/rodadas'
import type { Quadra } from '@/domain/types'
import FaixaRodada from './FaixaRodada'

vi.mock('@/firebase/rodadas', () => ({ abrirRodada: vi.fn(), encerrarRodada: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const base: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: [], ordem: 1, totalCasas: 4, faltam: 2, rodadasTotal: 1 }
const hoje = () => { const d = new Date(); d.setHours(14, 10, 0, 0); return d.getTime() }
const comRodada = (em: number): Quadra => ({ ...base, rodadasTotal: 2, rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em } })
const usuario = { uid: 'u1', nome: 'Maria S.' }

function renderFaixa(quadra: Quadra, cartaoAberto = true, onErro = vi.fn()) {
  render(<FaixaRodada cartaoId="c12" quadra={quadra} cartaoAberto={cartaoAberto} onErro={onErro} />)
  return onErro
}

describe('FaixaRodada', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(abrirRodada).mockResolvedValue()
    vi.mocked(encerrarRodada).mockResolvedValue()
    vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria Souza' }, membro: { papel: 'publicador', ativo: true, nome: 'Maria S.' } })
  })
  afterEach(cleanup)

  it('mostra rodada aberta com quem e hora', () => {
    renderFaixa(comRodada(hoje()))
    expect(screen.getByText('Rodada 2 · aberta por Ana às 14:10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar rodada' })).toBeInTheDocument()
  })

  it('mostra a data quando a rodada é de outro dia', () => {
    renderFaixa(comRodada(new Date(2026, 10, 2, 9, 0).getTime()))
    expect(screen.getByText('Rodada 2 · aberta em 02/11 por Ana')).toBeInTheDocument()
  })

  it('sem rodada mostra "Nenhuma rodada aberta"', () => {
    renderFaixa(base)
    expect(screen.getByText('Nenhuma rodada aberta')).toBeInTheDocument()
  })

  it('Abrir rodada chama abrirRodada com a quadra e o usuário', async () => {
    renderFaixa(base)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir rodada' }))
    expect(abrirRodada).toHaveBeenCalledWith('c12', base, usuario)
  })

  it('Encerrar rodada chama encerrarRodada', async () => {
    const q = comRodada(hoje())
    renderFaixa(q)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Encerrar rodada' }))
    expect(encerrarRodada).toHaveBeenCalledWith('c12', q, usuario)
  })

  it('falha de gravação chama onErro', async () => {
    vi.mocked(abrirRodada).mockRejectedValueOnce(new Error('falhou'))
    const onErro = renderFaixa(base)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir rodada' }))
    await waitFor(() => expect(onErro).toHaveBeenCalledTimes(1))
  })

  it('toque duplo em Abrir rodada grava uma vez só enquanto a escrita está pendente', async () => {
    vi.mocked(abrirRodada).mockReturnValue(new Promise(() => {}))
    renderFaixa(base)
    const user = userEvent.setup()
    const botao = screen.getByRole('button', { name: 'Abrir rodada' })
    await user.click(botao)
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await user.click(botao)
    expect(abrirRodada).toHaveBeenCalledTimes(1)
  })

  it('toque duplo em Encerrar rodada grava uma vez só', async () => {
    vi.mocked(encerrarRodada).mockReturnValue(new Promise(() => {}))
    renderFaixa(comRodada(hoje()))
    const user = userEvent.setup()
    const botao = screen.getByRole('button', { name: 'Encerrar rodada' })
    await user.click(botao)
    await user.click(botao)
    expect(encerrarRodada).toHaveBeenCalledTimes(1)
    expect(botao).toHaveAttribute('aria-disabled', 'true')
  })

  it('falha libera o botão de novo', async () => {
    vi.mocked(abrirRodada).mockRejectedValueOnce(new Error('falhou'))
    const onErro = renderFaixa(base)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir rodada' }))
    await waitFor(() => expect(onErro).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Abrir rodada' })).not.toHaveAttribute('aria-disabled')
    await user.click(screen.getByRole('button', { name: 'Abrir rodada' }))
    expect(abrirRodada).toHaveBeenCalledTimes(2)
  })

  it('quando a rodada aberta chega pela quadra, Encerrar rodada já fica disponível', async () => {
    vi.mocked(abrirRodada).mockReturnValue(new Promise(() => {}))
    const { rerender } = render(<FaixaRodada cartaoId="c12" quadra={base} cartaoAberto onErro={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir rodada' }))
    rerender(<FaixaRodada cartaoId="c12" quadra={comRodada(hoje())} cartaoAberto onErro={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Encerrar rodada' })).not.toHaveAttribute('aria-disabled')
  })

  it('usa a hora atual a cada render: rodada aberta depois da meia-noite não aparece como de outro dia', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date(2026, 10, 8, 23, 50))
      const { rerender } = render(<FaixaRodada cartaoId="c12" quadra={base} cartaoAberto onErro={vi.fn()} />)
      vi.setSystemTime(new Date(2026, 10, 9, 0, 6))
      rerender(<FaixaRodada cartaoId="c12" quadra={comRodada(new Date(2026, 10, 9, 0, 5).getTime())} cartaoAberto onErro={vi.fn()} />)
      expect(screen.getByText('Rodada 2 · aberta por Ana às 00:05')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('com o cartão fechado, Abrir rodada fica desativado e não grava', async () => {
    renderFaixa(base, false)
    const botao = screen.getByRole('button', { name: 'Abrir rodada' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(abrirRodada).not.toHaveBeenCalled()
  })

  it('com o cartão fechado e uma rodada aberta, Encerrar rodada continua disponível e grava', async () => {
    const q = comRodada(hoje())
    renderFaixa(q, false)
    const botao = screen.getByRole('button', { name: 'Encerrar rodada' })
    expect(botao).not.toHaveAttribute('aria-disabled')
    await userEvent.setup().click(botao)
    expect(encerrarRodada).toHaveBeenCalledWith('c12', q, usuario)
  })
})
