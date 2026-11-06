import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarMembros, salvarMembro } from '@/firebase/members'
import MembrosAdmin from './MembrosAdmin'

vi.mock('@/firebase/members', () => ({ observarMembros: vi.fn(), salvarMembro: vi.fn() }))
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
})
