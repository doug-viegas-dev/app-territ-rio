import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Quadra } from '@/domain/types'
import { useOnline } from '@/app/useOnline'
import { ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import { adicionarRua, atualizarQuadra, criarQuadra, excluirQuadra, observarQuadras, quadraTemCasas, trocarOrdemDeQuadras } from '@/firebase/blocks'
import QuadrasAdmin from './QuadrasAdmin'
import { ruasDoTexto } from './ruasDoTexto'

vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn(), adicionarRua: vi.fn(), atualizarQuadra: vi.fn(), criarQuadra: vi.fn(), excluirQuadra: vi.fn(), quadraTemCasas: vi.fn(), trocarOrdemDeQuadras: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const quadras: Quadra[] = [
  { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua das Acácias'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
  { id: 'q2', rotulo: 'Quadra 2', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'], ordem: 2, totalCasas: 0, faltam: 0, rodadasTotal: 0 },
]

describe('ruasDoTexto', () => {
  it('uma por linha, sem vazias nem repetidas', () => {
    expect(ruasDoTexto(' Rua A \n\n   \nrua a\nRua B\n')).toEqual(['Rua A', 'Rua B'])
  })
})

describe('QuadrasAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb(quadras); return () => {} })
    vi.mocked(atualizarQuadra).mockResolvedValue()
    vi.mocked(adicionarRua).mockResolvedValue()
    vi.mocked(criarQuadra).mockResolvedValue('q9')
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(quadraTemCasas).mockResolvedValue(false)
    vi.mocked(excluirQuadra).mockResolvedValue()
    vi.mocked(trocarOrdemDeQuadras).mockResolvedValue()
  })
  afterEach(cleanup)

  it('lista só as quadras do cartão recebido', () => {
    render(<QuadrasAdmin cartao={{ ...cartao, id: 'c7', numero: '7' }} />)
    expect(observarQuadras).toHaveBeenCalledWith('c7', expect.any(Function), expect.any(Function))
    expect(observarQuadras).not.toHaveBeenCalledWith('c12', expect.anything(), expect.anything())
    expect(screen.getByRole('button', { name: 'Editar Quadra 1' })).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Cartão' })).not.toBeInTheDocument()
  })

  it('edita o rótulo e as ruas (uma por linha, sem vazias nem repetidas)', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
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
    render(<QuadrasAdmin cartao={cartao} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    const folha = screen.getByRole('dialog', { name: 'Nova rua' })
    await user.click(within(folha).getByRole('radio', { name: 'Quadra 2' }))
    await user.type(within(folha).getByLabelText('Nome da rua'), '  Rua das Palmeiras ')
    await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
    expect(adicionarRua).toHaveBeenCalledWith('c12', 'q2', 'Rua das Palmeiras')
  })

  it('rua repetida na quadra não chama adicionarRua', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    const folha = screen.getByRole('dialog', { name: 'Nova rua' })
    await user.type(within(folha).getByLabelText('Nome da rua'), 'rua das acácias')
    await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
    expect(adicionarRua).not.toHaveBeenCalled()
    expect(within(folha).getByRole('alert')).toBeInTheDocument()
  })

  it('"Adicionar quadra" cria a quadra sem ruas', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }))
    const folha = screen.getByRole('dialog', { name: 'Nova quadra' })
    await user.type(within(folha).getByLabelText('Nome da quadra'), 'Quadra 5')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(criarQuadra).toHaveBeenCalledWith('c12', { rotulo: 'Quadra 5', ruas: [] })
  })

  async function abrirEdicao(nome: string) {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: `Editar ${nome}` }))
    return { user, folha: screen.getByRole('dialog', { name: 'Editar quadra' }) }
  }

  async function abrirConfirmacao(nome: string) {
    const { user, folha } = await abrirEdicao(nome)
    const botao = within(folha).getByRole('button', { name: 'Excluir quadra' })
    await vi.waitFor(() => expect(botao).not.toHaveAttribute('aria-disabled'))
    await user.click(botao)
    return { user, botao, conf: screen.getByRole('dialog', { name: 'Confirmar exclusão da quadra' }) }
  }

  it('nome repetido ao criar não grava', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }))
    const folha = screen.getByRole('dialog', { name: 'Nova quadra' })
    await user.type(within(folha).getByLabelText('Nome da quadra'), 'quadra 1')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(within(folha).getByRole('alert')).toHaveTextContent('Já existe uma quadra com esse nome.')
    expect(criarQuadra).not.toHaveBeenCalled()
  })

  it('editar mantendo o próprio nome é permitido', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const { user, folha } = await abrirEdicao('Quadra 2')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(atualizarQuadra).toHaveBeenCalledWith('c12', 'q2', { rotulo: 'Quadra 2', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'] })
  })

  it('nome com 41 caracteres não grava', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const { user, folha } = await abrirEdicao('Quadra 2')
    const nome = within(folha).getByLabelText('Nome da quadra')
    await user.clear(nome)
    await user.type(nome, 'x'.repeat(41))
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(within(folha).getByRole('alert')).toHaveTextContent('O nome pode ter até 40 caracteres.')
    expect(atualizarQuadra).not.toHaveBeenCalled()
  })

  it('Subir troca a ordem com a quadra de cima', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const { user, folha } = await abrirEdicao('Quadra 2')
    await user.click(within(folha).getByRole('button', { name: 'Subir' }))
    expect(trocarOrdemDeQuadras).toHaveBeenCalledWith('c12', [{ id: 'q2', ordem: 1 }, { id: 'q1', ordem: 2 }])
  })

  it('na primeira quadra Subir fica desabilitado; na última, Descer', async () => {
    render(<QuadrasAdmin cartao={cartao} />)
    const um = await abrirEdicao('Quadra 1')
    expect(within(um.folha).getByRole('button', { name: 'Subir' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(um.folha).getByText('Já é a primeira')).toBeInTheDocument()
    await um.user.click(within(um.folha).getByRole('button', { name: 'Subir' }))
    expect(trocarOrdemDeQuadras).not.toHaveBeenCalled()
    cleanup()
    render(<QuadrasAdmin cartao={cartao} />)
    const dois = await abrirEdicao('Quadra 2')
    expect(within(dois.folha).getByRole('button', { name: 'Descer' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(dois.folha).getByText('Já é a última')).toBeInTheDocument()
  })

  describe('Excluir quadra', () => {
    it('com volta aberta fica desabilitado com o texto do bloqueio', async () => {
      vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([{ ...quadras[0], rodadaAtual: { id: 'r1', numero: 1, porNome: 'Ana', em: 1 } }, quadras[1]]); return () => {} })
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, folha } = await abrirEdicao('Quadra 1')
      const botao = within(folha).getByRole('button', { name: 'Excluir quadra' })
      expect(botao).toHaveAttribute('aria-disabled', 'true')
      expect(within(folha).getByText(TEXTOS_BLOQUEIO['quadra.volta'])).toBeInTheDocument()
      await user.click(botao)
      expect(screen.queryByRole('dialog', { name: 'Confirmar exclusão da quadra' })).not.toBeInTheDocument()
    })

    it('sem rede mostra "Precisa de internet." e não abre', async () => {
      vi.mocked(useOnline).mockReturnValue(false)
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, folha } = await abrirEdicao('Quadra 1')
      const botao = within(folha).getByRole('button', { name: 'Excluir quadra' })
      expect(botao).toHaveAttribute('aria-disabled', 'true')
      expect(within(folha).getByText('Precisa de internet.')).toBeInTheDocument()
      await user.click(botao)
      expect(screen.queryByRole('dialog', { name: 'Confirmar exclusão da quadra' })).not.toBeInTheDocument()
    })

    it('quadra com casas bloqueia com o texto de casas', async () => {
      vi.mocked(quadraTemCasas).mockResolvedValue(true)
      render(<QuadrasAdmin cartao={cartao} />)
      const { folha } = await abrirEdicao('Quadra 1')
      expect(await within(folha).findByText(TEXTOS_BLOQUEIO['quadra.casas'])).toBeInTheDocument()
      expect(quadraTemCasas).toHaveBeenCalledWith('c12', 'q1')
      expect(within(folha).getByRole('button', { name: 'Excluir quadra' })).toHaveAttribute('aria-disabled', 'true')
    })

    it('confirmar exclui; foco inicial em Cancelar', async () => {
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, conf } = await abrirConfirmacao('Quadra 1')
      expect(within(conf).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
      await user.click(within(conf).getByRole('button', { name: /^Excluir Quadra 1/ }))
      expect(excluirQuadra).toHaveBeenCalledWith('c12', 'q1')
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('Cancelar devolve o foco ao botão de origem sem excluir', async () => {
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, botao, conf } = await abrirConfirmacao('Quadra 1')
      await user.click(within(conf).getByRole('button', { name: 'Cancelar' }))
      expect(botao).toHaveFocus()
      expect(excluirQuadra).not.toHaveBeenCalled()
    })

    it('ExclusaoBloqueada("casas") na confirmação mostra o texto de casas', async () => {
      vi.mocked(excluirQuadra).mockRejectedValue(new ExclusaoBloqueada('casas'))
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, conf } = await abrirConfirmacao('Quadra 1')
      await user.click(within(conf).getByRole('button', { name: /^Excluir Quadra 1/ }))
      expect(await within(conf).findByRole('alert')).toHaveTextContent(TEXTOS_BLOQUEIO['quadra.casas'])
    })

    it('not-found mostra "Este item foi removido por outra pessoa."', async () => {
      vi.mocked(excluirQuadra).mockRejectedValue(Object.assign(new Error('x'), { code: 'not-found' }))
      render(<QuadrasAdmin cartao={cartao} />)
      const { user, conf } = await abrirConfirmacao('Quadra 1')
      await user.click(within(conf).getByRole('button', { name: /^Excluir Quadra 1/ }))
      expect(await within(conf).findByRole('alert')).toHaveTextContent('Este item foi removido por outra pessoa.')
    })
  })
})
