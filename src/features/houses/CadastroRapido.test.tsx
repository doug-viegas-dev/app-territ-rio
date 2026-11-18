import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Casa, Quadra } from '@/domain/types'
import { criarCasa } from '@/firebase/houses'
import CadastroRapido from './CadastroRapido'

vi.mock('@/firebase/houses', () => ({ criarCasa: vi.fn() }))

const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }
const casaB: Casa = { id: 'h2', rua: 'Rua das Acácias', numero: '124', ordem: 2, status: 'pendente', criadoEm: 2 }

function abrir() {
  const onAdicionada = vi.fn()
  const onMaisOpcoes = vi.fn()
  const onErro = vi.fn()
  render(<CadastroRapido rua="Rua das Acácias" quadra={quadra} casas={[casaB]} cartaoId="c12" onAdicionada={onAdicionada} onMaisOpcoes={onMaisOpcoes} onErro={onErro} />)
  return { onAdicionada, onMaisOpcoes, onErro, user: userEvent.setup() }
}

const campo = () => screen.getByRole('textbox')
const adicionar = () => screen.getByRole('button', { name: 'Adicionar' })

describe('CadastroRapido', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(criarCasa).mockResolvedValue('novo') })
  afterEach(() => cleanup())

  it('adiciona pelo botão: chama criarCasa com rua e número e esvazia o campo', async () => {
    const { user, onAdicionada } = abrir()
    await user.type(campo(), '232')
    await user.click(adicionar())
    expect(criarCasa).toHaveBeenCalledWith('c12', 'q3', { rua: 'Rua das Acácias', numero: '232' }, [casaB], { quadraSemContadores: false })
    expect(campo()).toHaveValue('')
    expect(onAdicionada).toHaveBeenCalledWith({ rua: 'Rua das Acácias', numero: '232' })
  })

  it('Enter também adiciona', async () => {
    const { user } = abrir()
    await user.type(campo(), '233{Enter}')
    expect(criarCasa).toHaveBeenCalledTimes(1)
  })

  it('toque duplo não cria duas casas', async () => {
    const { user } = abrir()
    await user.type(campo(), '232')
    await user.dblClick(adicionar())
    expect(criarCasa).toHaveBeenCalledTimes(1)
  })

  it('campo vazio mostra "Digite o número da casa." e não chama criarCasa', async () => {
    const { user } = abrir()
    await user.click(adicionar())
    expect(screen.getByRole('alert')).toHaveTextContent('Digite o número da casa.')
    expect(criarCasa).not.toHaveBeenCalled()
  })

  it('colar "12a4" deixa só 124', async () => {
    const { user } = abrir()
    await user.click(campo())
    await user.paste('12a4')
    expect(campo()).toHaveValue('124')
  })

  it('número repetido avisa mas salva', async () => {
    const { user } = abrir()
    await user.type(campo(), '124')
    expect(screen.getByRole('status')).toHaveTextContent('Já existe um 124 nesta rua. Pode salvar mesmo assim.')
    await user.click(adicionar())
    expect(criarCasa).toHaveBeenCalledTimes(1)
  })

  it('Sem número troca para Descrição curta e mantém o modo depois de adicionar', async () => {
    const { user, onAdicionada } = abrir()
    await user.click(screen.getByRole('button', { name: 'Sem número' }))
    expect(screen.getByLabelText('Descrição curta')).toBeInTheDocument()
    await user.type(campo(), 'Portão azul')
    await user.click(adicionar())
    expect(criarCasa).toHaveBeenCalledWith('c12', 'q3', { rua: 'Rua das Acácias', descricao: 'Portão azul' }, [casaB], { quadraSemContadores: false })
    expect(onAdicionada).toHaveBeenCalledWith({ rua: 'Rua das Acácias', descricao: 'Portão azul' })
    expect(screen.getByLabelText('Descrição curta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Com número' })).toBeInTheDocument()
  })

  it('descrição vazia mostra "Escreva uma descrição curta."', async () => {
    const { user } = abrir()
    await user.click(screen.getByRole('button', { name: 'Sem número' }))
    await user.click(adicionar())
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva uma descrição curta.')
    expect(criarCasa).not.toHaveBeenCalled()
  })

  it('Mais opções chama onMaisOpcoes com a rua', async () => {
    const { user, onMaisOpcoes } = abrir()
    await user.click(screen.getByRole('button', { name: 'Mais opções' }))
    expect(onMaisOpcoes).toHaveBeenCalledWith('Rua das Acácias')
  })

  it('falha de criarCasa chama onErro', async () => {
    vi.mocked(criarCasa).mockRejectedValue(new Error('x'))
    const { user, onErro } = abrir()
    await user.type(campo(), '232{Enter}')
    await vi.waitFor(() => expect(onErro).toHaveBeenCalled())
  })

  it('foco volta ao campo depois de adicionar', async () => {
    const { user } = abrir()
    await user.type(campo(), '232')
    await user.click(adicionar())
    expect(campo()).toHaveFocus()
  })

  it('rola o campo de volta para a vista depois de adicionar (a lista cresce acima dele)', async () => {
    const rolar = vi.fn()
    HTMLElement.prototype.scrollIntoView = rolar
    const { user } = abrir()
    await user.type(campo(), '232')
    await user.click(adicionar())
    await vi.waitFor(() => expect(rolar).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' }))
  })
})
