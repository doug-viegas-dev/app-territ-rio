import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import type { Cartao, Quadra } from '@/domain/types'
import { cartaoTemCasas, excluirCartao } from '@/firebase/cards'
import { apagarArquivosDoCartao } from '@/firebase/storage'
import { ExcluirCartao } from './ExcluirCartao'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/firebase/cards', () => ({ cartaoTemCasas: vi.fn(), excluirCartao: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ apagarArquivosDoCartao: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'fechado', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const quadra: Quadra = { id: 'q1', rotulo: 'Quadra 1', ruas: [], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }
const botao = () => screen.getByRole('button', { name: 'Excluir cartão' })

describe('ExcluirCartao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(cartaoTemCasas).mockResolvedValue(false)
    vi.mocked(excluirCartao).mockResolvedValue()
    vi.mocked(apagarArquivosDoCartao).mockResolvedValue()
  })
  afterEach(cleanup)

  it('cartão aberto bloqueia com o texto do motivo', () => {
    render(<ExcluirCartao cartao={{ ...cartao, estado: 'aberto' }} quadras={[quadra]} />)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(TEXTOS_BLOQUEIO['cartao.aberto'])).toBeInTheDocument()
    expect(cartaoTemCasas).not.toHaveBeenCalled()
  })

  it('volta aberta bloqueia com o texto do motivo', () => {
    render(<ExcluirCartao cartao={cartao} quadras={[{ ...quadra, rodadaAtual: { id: 'r1', numero: 1, porNome: 'Ana', em: 0 } }]} />)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(TEXTOS_BLOQUEIO['cartao.volta'])).toBeInTheDocument()
  })

  it('sem internet bloqueia com "Precisa de internet."', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    render(<ExcluirCartao cartao={cartao} quadras={[quadra]} />)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Precisa de internet.')).toBeInTheDocument()
  })

  it('enquanto as quadras carregam, pede para aguardar', () => {
    render(<ExcluirCartao cartao={cartao} quadras={null} />)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Aguarde: ainda estamos carregando as quadras do cartão.')).toBeInTheDocument()
  })

  it('mostra "Verificando…" e bloqueia quando o servidor diz que há casas', async () => {
    vi.mocked(cartaoTemCasas).mockResolvedValue(true)
    render(<ExcluirCartao cartao={cartao} quadras={[quadra]} />)
    expect(screen.getByText('Verificando…')).toBeInTheDocument()
    expect(await screen.findByText(TEXTOS_BLOQUEIO['cartao.casas'])).toBeInTheDocument()
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(cartaoTemCasas).toHaveBeenCalledWith('c12')
  })

  it('se a verificação falha, o botão continua habilitado', async () => {
    vi.mocked(cartaoTemCasas).mockRejectedValue(new Error('rede'))
    render(<ExcluirCartao cartao={cartao} quadras={[quadra]} />)
    await waitFor(() => expect(screen.queryByText('Verificando…')).not.toBeInTheDocument())
    expect(botao()).not.toHaveAttribute('aria-disabled')
  })

  async function abrirFolha(user: ReturnType<typeof userEvent.setup>) {
    render(<ExcluirCartao cartao={cartao} quadras={[quadra]} />)
    await waitFor(() => expect(screen.queryByText('Verificando…')).not.toBeInTheDocument())
    await user.click(botao())
    return screen.getByRole('dialog', { name: 'Excluir cartão' })
  }

  it('abre a folha com o efeito escrito e foco em Cancelar; Cancelar devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    const folha = await abrirFolha(user)
    expect(folha).toHaveTextContent('Não dá para desfazer')
    const cancelar = screen.getByRole('button', { name: 'Cancelar' })
    expect(cancelar).toHaveFocus()
    await user.click(cancelar)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botao()).toHaveFocus()
  })

  it('confirmar exclui, apaga os arquivos e navega para a lista', async () => {
    const user = userEvent.setup()
    await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(excluirCartao).toHaveBeenCalledWith('c12')
    expect(apagarArquivosDoCartao).toHaveBeenCalledWith('c12')
    expect(vi.mocked(excluirCartao).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(apagarArquivosDoCartao).mock.invocationCallOrder[0])
    expect(navigate).toHaveBeenCalledWith('/admin', { state: { aba: 'cartoes', excluido: '12' } })
  })

  it('se só apagar os arquivos falha, navega com arquivosFicaram', async () => {
    vi.mocked(apagarArquivosDoCartao).mockRejectedValue(new Error('x'))
    const user = userEvent.setup()
    await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin', { state: { aba: 'cartoes', excluido: '12', arquivosFicaram: true } }))
  })

  it('ExclusaoBloqueada("casas") mostra o texto e não navega', async () => {
    vi.mocked(excluirCartao).mockRejectedValue(new ExclusaoBloqueada('casas'))
    const user = userEvent.setup()
    const folha = await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTOS_BLOQUEIO['cartao.casas'])
    expect(folha).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(apagarArquivosDoCartao).not.toHaveBeenCalled()
  })

  it('outro erro mostra "Não foi possível excluir"', async () => {
    vi.mocked(excluirCartao).mockRejectedValue(new Error('rede'))
    const user = userEvent.setup()
    await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('permission-denied mostra a frase de permissão', async () => {
    vi.mocked(excluirCartao).mockRejectedValue({ code: 'permission-denied' })
    const user = userEvent.setup()
    await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para fazer isso.')
  })

  it('durante o envio o botão fica "Excluindo…" e o segundo toque não chama de novo', async () => {
    let soltar: () => void = () => {}
    vi.mocked(excluirCartao).mockReturnValue(new Promise<void>((r) => { soltar = r }))
    const user = userEvent.setup()
    await abrirFolha(user)
    await user.click(screen.getByRole('button', { name: 'Excluir cartão 12' }))
    const emCurso = screen.getByRole('button', { name: 'Excluindo…' })
    expect(emCurso).toBeDisabled()
    await user.click(emCurso)
    expect(excluirCartao).toHaveBeenCalledTimes(1)
    soltar()
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
