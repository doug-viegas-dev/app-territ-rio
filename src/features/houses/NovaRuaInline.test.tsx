import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Quadra } from '@/domain/types'
import { adicionarRua } from '@/firebase/blocks'
import NovaRuaInline from './NovaRuaInline'

vi.mock('@/firebase/blocks', () => ({ adicionarRua: vi.fn() }))

const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }

function abrir() {
  const onErro = vi.fn()
  render(<NovaRuaInline cartaoId="c12" quadra={quadra} ruas={['Rua das Acácias']} onErro={onErro} />)
  return { onErro, user: userEvent.setup() }
}
const tocarNovaRua = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Nova rua' }))

describe('NovaRuaInline', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(adicionarRua).mockResolvedValue(undefined) })
  afterEach(() => cleanup())

  it('abre o campo ao tocar em Nova rua', async () => {
    const { user } = abrir()
    expect(screen.queryByLabelText('Nome da rua')).not.toBeInTheDocument()
    await tocarNovaRua(user)
    expect(screen.getByLabelText('Nome da rua')).toHaveFocus()
  })

  it('adiciona a rua e fecha', async () => {
    const { user } = abrir()
    await tocarNovaRua(user)
    await user.type(screen.getByLabelText('Nome da rua'), 'Rua Ipê{Enter}')
    expect(adicionarRua).toHaveBeenCalledWith('c12', 'q3', 'Rua Ipê')
    expect(screen.queryByLabelText('Nome da rua')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova rua' })).toBeInTheDocument()
  })

  it('nome vazio mostra "Digite o nome da rua."', async () => {
    const { user } = abrir()
    await tocarNovaRua(user)
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite o nome da rua.')
    expect(adicionarRua).not.toHaveBeenCalled()
  })

  it('rua repetida, com maiúsculas diferentes, mostra "Essa rua já existe nesta quadra."', async () => {
    const { user } = abrir()
    await tocarNovaRua(user)
    await user.type(screen.getByLabelText('Nome da rua'), 'RUA DAS ACÁCIAS')
    await user.click(screen.getByRole('button', { name: 'Adicionar rua' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Essa rua já existe nesta quadra.')
    expect(adicionarRua).not.toHaveBeenCalled()
  })

  it('Cancelar fecha sem chamar adicionarRua', async () => {
    const { user } = abrir()
    await tocarNovaRua(user)
    await user.type(screen.getByLabelText('Nome da rua'), 'Rua Ipê')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByLabelText('Nome da rua')).not.toBeInTheDocument()
    expect(adicionarRua).not.toHaveBeenCalled()
  })

  it('falha de adicionarRua chama onErro', async () => {
    vi.mocked(adicionarRua).mockRejectedValue(new Error('x'))
    const { user, onErro } = abrir()
    await tocarNovaRua(user)
    await user.type(screen.getByLabelText('Nome da rua'), 'Rua Ipê{Enter}')
    await vi.waitFor(() => expect(onErro).toHaveBeenCalled())
  })
})
