import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessao } from '@/features/auth/AuthProvider'
import { useOnline } from '@/app/useOnline'
import { observarMembros, removerMembro, salvarMembro } from '@/firebase/members'
import MembrosAdmin from './MembrosAdmin'

vi.mock('@/firebase/members', () => ({ observarMembros: vi.fn(), salvarMembro: vi.fn(), removerMembro: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const membros = [
  { email: 'maria@gmail.com', nome: 'Maria Souza', papel: 'admin' as const, ativo: true },
  { email: 'ana@gmail.com', nome: 'Ana Pereira', papel: 'publicador' as const, ativo: true },
  { email: 'joana@gmail.com', nome: 'Joana Lima', papel: 'publicador' as const, ativo: false },
]

describe('MembrosAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarMembros).mockImplementation((cb) => { cb(membros); return () => {} })
    vi.mocked(salvarMembro).mockResolvedValue()
    vi.mocked(removerMembro).mockResolvedValue()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'Maria@gmail.com', nome: 'Maria Souza' }, membro: { papel: 'admin', ativo: true, nome: 'Maria Souza' } })
  })
  afterEach(cleanup)

  it('lista e-mail, nome, papel e a chave Ativo/Inativo', () => {
    render(<MembrosAdmin />)
    expect(screen.getByText('ana@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Ana Pereira: Ativo' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Joana Lima: Inativo' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/3 pessoas/)).toBeInTheDocument()
  })

  it('alternar "ativo" chama salvarMembro', async () => {
    render(<MembrosAdmin />)
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Joana Lima: Inativo' }))
    expect(salvarMembro).toHaveBeenCalledWith('joana@gmail.com', { nome: 'Joana Lima', papel: 'publicador', ativo: true })
  })

  it('o administrador não consegue desativar a si mesmo', async () => {
    render(<MembrosAdmin />)
    const eu = screen.getByRole('switch', { name: 'Maria Souza: Ativo' })
    expect(eu).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(eu)
    expect(salvarMembro).not.toHaveBeenCalled()
  })

  it('adicionar e-mail normaliza para minúsculas', async () => {
    render(<MembrosAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Liberar novo e-mail' }))
    const folha = screen.getByRole('dialog', { name: 'Liberar novo e-mail' })
    await user.type(within(folha).getByLabelText('E-mail do Google'), '  Paulo.R@Gmail.COM ')
    await user.type(within(folha).getByLabelText('Nome'), 'Paulo Ribeiro')
    await user.click(within(folha).getByRole('radio', { name: 'Administrador' }))
    await user.click(within(folha).getByRole('button', { name: 'Liberar' }))
    expect(salvarMembro).toHaveBeenCalledWith('paulo.r@gmail.com', { nome: 'Paulo Ribeiro', papel: 'admin', ativo: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('e-mail inválido ou repetido não salva', async () => {
    render(<MembrosAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Liberar novo e-mail' }))
    const folha = screen.getByRole('dialog', { name: 'Liberar novo e-mail' })
    await user.type(within(folha).getByLabelText('Nome'), 'Fulano')
    await user.type(within(folha).getByLabelText('E-mail do Google'), 'sem-arroba')
    await user.click(within(folha).getByRole('button', { name: 'Liberar' }))
    expect(within(folha).getByRole('alert')).toHaveTextContent('e-mail válido')
    await user.clear(within(folha).getByLabelText('E-mail do Google'))
    await user.type(within(folha).getByLabelText('E-mail do Google'), 'ANA@gmail.com')
    await user.click(within(folha).getByRole('button', { name: 'Liberar' }))
    expect(within(folha).getByRole('alert')).toHaveTextContent('já está na lista')
    expect(salvarMembro).not.toHaveBeenCalled()
  })

  describe('editar e remover', () => {
    async function abrir(nome: string) {
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: `Editar ${nome}` }))
      return { user, folha: screen.getByRole('dialog', { name: 'Editar membro' }) }
    }

    it('abre com nome e papel preenchidos e Salvar mantém ativo', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Ana Pereira')
      expect(within(folha).getByLabelText('Nome')).toHaveValue('Ana Pereira')
      expect(within(folha).getByRole('radio', { name: 'Publicador' })).toHaveAttribute('aria-checked', 'true')
      await user.clear(within(folha).getByLabelText('Nome'))
      await user.type(within(folha).getByLabelText('Nome'), 'Ana P. Souza')
      await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
      expect(salvarMembro).toHaveBeenCalledWith('ana@gmail.com', { nome: 'Ana P. Souza', papel: 'publicador', ativo: true })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('mantém ativo: false de quem está inativo', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Joana Lima')
      await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
      expect(salvarMembro).toHaveBeenCalledWith('joana@gmail.com', { nome: 'Joana Lima', papel: 'publicador', ativo: false })
    })

    it('nome vazio ou com 81 caracteres não salva', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Ana Pereira')
      const campo = within(folha).getByLabelText('Nome')
      await user.clear(campo)
      await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
      expect(within(folha).getByRole('alert')).toHaveTextContent('Digite o nome da pessoa.')
      await user.click(campo)
      await user.paste('x'.repeat(81))
      await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
      expect(within(folha).getByRole('alert')).toHaveTextContent('O nome pode ter até 80 caracteres.')
      expect(salvarMembro).not.toHaveBeenCalled()
    })

    it('promove a administrador; rebaixar outro administrador é permitido', async () => {
      vi.mocked(observarMembros).mockImplementation((cb) => { cb([...membros, { email: 'paulo@gmail.com', nome: 'Paulo Reis', papel: 'admin', ativo: true }]); return () => {} })
      render(<MembrosAdmin />)
      let r = await abrir('Ana Pereira')
      await r.user.click(within(r.folha).getByRole('radio', { name: 'Administrador' }))
      await r.user.click(within(r.folha).getByRole('button', { name: 'Salvar' }))
      expect(salvarMembro).toHaveBeenLastCalledWith('ana@gmail.com', { nome: 'Ana Pereira', papel: 'admin', ativo: true })
      r = await abrir('Paulo Reis')
      await r.user.click(within(r.folha).getByRole('radio', { name: 'Publicador' }))
      await r.user.click(within(r.folha).getByRole('button', { name: 'Salvar' }))
      expect(salvarMembro).toHaveBeenLastCalledWith('paulo@gmail.com', { nome: 'Paulo Reis', papel: 'publicador', ativo: true })
    })

    it('no próprio administrador o papel fica travado e não há Remover da lista', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Maria Souza')
      expect(within(folha).getByText('Você não pode mudar o seu próprio papel.')).toBeInTheDocument()
      const publicador = within(folha).getByRole('radio', { name: 'Publicador' })
      expect(publicador).toHaveAttribute('aria-disabled', 'true')
      await user.click(publicador)
      await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
      expect(salvarMembro).toHaveBeenCalledWith('maria@gmail.com', { nome: 'Maria Souza', papel: 'admin', ativo: true })
      expect(within(folha).queryByRole('button', { name: 'Remover da lista' })).toBeNull()
    })

    it('Remover da lista confirma, com foco em Cancelar, e chama removerMembro', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Ana Pereira')
      await user.click(within(folha).getByRole('button', { name: 'Remover da lista' }))
      const conf = screen.getByRole('dialog', { name: 'Remover Ana Pereira?' })
      expect(within(conf).getByText('A conta de Ana Pereira deixa de existir. Se a pessoa entrar de novo com o Google, não terá acesso até você liberar o e-mail.')).toBeInTheDocument()
      expect(within(conf).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
      await user.click(within(conf).getByRole('button', { name: /^Remover Ana Pereira$/ }))
      expect(removerMembro).toHaveBeenCalledWith('ana@gmail.com')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('falha mostra o erro; permission-denied tem frase própria', async () => {
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Ana Pereira')
      await user.click(within(folha).getByRole('button', { name: 'Remover da lista' }))
      const conf = screen.getByRole('dialog', { name: 'Remover Ana Pereira?' })
      vi.mocked(removerMembro).mockRejectedValueOnce(new Error('rede'))
      await user.click(within(conf).getByRole('button', { name: /^Remover Ana Pereira$/ }))
      expect(await within(conf).findByRole('alert')).toHaveTextContent('Não foi possível remover')
      vi.mocked(removerMembro).mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'permission-denied' }))
      await user.click(within(conf).getByRole('button', { name: /^Remover Ana Pereira$/ }))
      expect(await within(conf).findByText('Você não tem permissão para fazer isso.')).toBeInTheDocument()
    })

    it('sem rede, Remover da lista fica desabilitado com o texto', async () => {
      vi.mocked(useOnline).mockReturnValue(false)
      render(<MembrosAdmin />)
      const { user, folha } = await abrir('Ana Pereira')
      const botao = within(folha).getByRole('button', { name: 'Remover da lista' })
      expect(botao).toHaveAttribute('aria-disabled', 'true')
      expect(within(folha).getByText('Precisa de internet.')).toBeInTheDocument()
      await user.click(botao)
      expect(screen.queryByRole('dialog', { name: 'Remover Ana Pereira?' })).toBeNull()
    })
  })

  it('liberar e-mail recusa nome com mais de 80 caracteres', async () => {
    render(<MembrosAdmin />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Liberar novo e-mail' }))
    const folha = screen.getByRole('dialog', { name: 'Liberar novo e-mail' })
    await user.type(within(folha).getByLabelText('E-mail do Google'), 'novo@gmail.com')
    await user.click(within(folha).getByLabelText('Nome'))
    await user.paste('x'.repeat(81))
    await user.click(within(folha).getByRole('button', { name: 'Liberar' }))
    expect(within(folha).getByRole('alert')).toHaveTextContent('O nome pode ter até 80 caracteres.')
    expect(salvarMembro).not.toHaveBeenCalled()
  })
})
