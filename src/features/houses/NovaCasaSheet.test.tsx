import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import type { Cartao, Casa, Quadra } from '@/domain/types'
import { adicionarRua } from '@/firebase/blocks'
import { criarCasa, criarCasasEmFaixa } from '@/firebase/houses'
import { abrirRodada } from '@/firebase/rodadas'
import NovaCasaSheet from './NovaCasaSheet'

vi.mock('@/firebase/blocks', () => ({ adicionarRua: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ criarCasa: vi.fn(), criarCasasEmFaixa: vi.fn() }))
vi.mock('@/firebase/rodadas', () => ({ abrirRodada: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))

const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }
const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 2, resolvidas: 0, atualizadoEm: 0 }
const usuario = { uid: 'u1', nome: 'Maria S.' }
const quadraAberta: Quadra = { ...quadra, rodadaAtual: { id: 'r1', numero: 3, porNome: 'João', em: 1 } }
const casaA: Casa = { id: 'h1', rua: 'Rua das Acácias', numero: '120', ordem: 1, status: 'pendente', criadoEm: 1 }
const casaB: Casa = { id: 'h2', rua: 'Rua das Acácias', numero: '124', ordem: 2, status: 'pendente', criadoEm: 2 }

function abrir(props: Partial<React.ComponentProps<typeof NovaCasaSheet>> = {}) {
  const onFechar = vi.fn()
  render(
    <MemoryRouter>
      <NovaCasaSheet quadra={quadra} casas={[casaA, casaB]} cartaoId="c12" cartao={cartao} usuario={usuario} onFechar={onFechar} {...props} />
    </MemoryRouter>,
  )
  return { onFechar, user: userEvent.setup() }
}

const campoNumero = () => screen.getByLabelText(/^Número/)
const campoDescricao = () => screen.getByLabelText(/^Descrição/)

describe('NovaCasaSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(criarCasa).mockResolvedValue('novo')
    vi.mocked(criarCasasEmFaixa).mockResolvedValue()
    vi.mocked(adicionarRua).mockResolvedValue()
    vi.mocked(abrirRodada).mockResolvedValue()
  })
  afterEach(cleanup)

  it('sem número e sem descrição mostra o erro e não cria a casa', async () => {
    const { user } = abrir()
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o número ou uma descrição.')
    expect(criarCasa).not.toHaveBeenCalled()
  })

  it('só com descrição cria a casa', async () => {
    const { user } = abrir()
    await user.type(campoDescricao(), 'portão azul')
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    expect(criarCasa).toHaveBeenCalledWith('c12', 'q3', { rua: 'Rua das Acácias', numero: '', descricao: 'portão azul', depoisDe: undefined }, [casaA, casaB])
  })

  it('número já existente na rua mostra o aviso, mas ainda salva', async () => {
    const { user } = abrir()
    await user.type(campoNumero(), '120')
    expect(screen.getByText(/Já existe um 120 nesta rua/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    expect(criarCasa).toHaveBeenCalledTimes(1)
  })

  it('o aviso só vale para a rua escolhida', async () => {
    const { user } = abrir()
    await user.click(screen.getByRole('radio', { name: 'Rua Ipê Amarelo' }))
    await user.type(campoNumero(), '120')
    expect(screen.queryByText(/Já existe um 120/)).not.toBeInTheDocument()
  })

  it('depois de salvar o sheet continua aberto, com a rua mantida e os campos limpos', async () => {
    const { user, onFechar } = abrir()
    await user.click(screen.getByRole('radio', { name: 'Rua Ipê Amarelo' }))
    await user.type(campoNumero(), '112')
    await user.type(campoDescricao(), 'muro baixo')
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    await waitFor(() => expect(campoNumero()).toHaveValue(''))
    expect(campoDescricao()).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Rua Ipê Amarelo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Casa salva')).toBeInTheDocument()
    expect(onFechar).not.toHaveBeenCalled()
  })

  it('"Salvar" cria a casa e fecha', async () => {
    const { user, onFechar } = abrir()
    await user.type(campoNumero(), '130')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(criarCasa).toHaveBeenCalledTimes(1)
    expect(onFechar).toHaveBeenCalled()
  })

  it('"Adicionar depois desta" envia depoisDe e usa a rua dela', async () => {
    const { user } = abrir({ depoisDe: casaA })
    await user.type(campoNumero(), '122')
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    expect(criarCasa).toHaveBeenCalledWith('c12', 'q3', { rua: 'Rua das Acácias', numero: '122', descricao: '', depoisDe: 'h1' }, [casaA, casaB])
    await waitFor(() => expect(campoNumero()).toHaveValue(''))
    await user.type(campoNumero(), '123')
    await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
    expect(vi.mocked(criarCasa).mock.calls[1][2].depoisDe).toBe('novo')
  })

  describe('O que aconteceu', () => {
    const grupo = () => screen.getByRole('radiogroup', { name: 'O que aconteceu' })

    it('mostra as cinco opções com Pendente marcada por padrão', () => {
      abrir({ quadra: quadraAberta })
      const nomes = within(grupo()).getAllByRole('radio').map((r) => r.textContent)
      expect(nomes).toEqual(['Pendente', 'Conversado', 'Não atendeu', 'Estudo', 'Não visitar'])
      expect(within(grupo()).getByRole('radio', { name: 'Pendente' })).toHaveAttribute('aria-checked', 'true')
    })

    it('escolher Falado salva a casa com resultado, ciclo e rodada', async () => {
      const { user } = abrir({ quadra: quadraAberta })
      await user.type(campoNumero(), '130')
      await user.click(within(grupo()).getByRole('radio', { name: 'Conversado' }))
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(criarCasa).toHaveBeenCalledWith('c12', 'q3', {
        rua: 'Rua das Acácias', numero: '130', descricao: '', depoisDe: undefined,
        resultado: { status: 'falado', usuario: { uid: 'u1', nome: 'Maria S.' }, ciclo: 2, rodada: 3 },
      }, [casaA, casaB])
    })

    it('Pendente salva sem resultado', async () => {
      const { user } = abrir({ quadra: quadraAberta })
      await user.type(campoNumero(), '130')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(criarCasa).toHaveBeenCalledTimes(1)
      expect(vi.mocked(criarCasa).mock.calls[0][2]).not.toHaveProperty('resultado')
    })

    it('sem rodada aberta a linha fica desativada com o aviso e o botão Abrir rodada', async () => {
      const { user } = abrir()
      expect(screen.getByText('Abra a rodada para registrar o que aconteceu')).toBeInTheDocument()
      const opcoes = within(grupo()).getAllByRole('radio')
      opcoes.forEach((o) => expect(o).toHaveAttribute('aria-disabled', 'true'))
      await user.click(within(grupo()).getByRole('radio', { name: 'Conversado' }))
      expect(within(grupo()).getByRole('radio', { name: 'Pendente' })).toHaveAttribute('aria-checked', 'true')
      await user.type(campoNumero(), '130')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(vi.mocked(criarCasa).mock.calls[0][2]).not.toHaveProperty('resultado')
      cleanup()
      const outra = abrir()
      await outra.user.click(screen.getByRole('button', { name: 'Abrir rodada' }))
      expect(abrirRodada).toHaveBeenCalledWith('c12', quadra, usuario)
    })

    it('com o cartão fechado a linha também fica desativada', () => {
      abrir({ quadra: quadraAberta, cartao: { ...cartao, estado: 'fechado' } })
      expect(screen.getByText('Abra a rodada para registrar o que aconteceu')).toBeInTheDocument()
      expect(within(grupo()).getByRole('radio', { name: 'Conversado' })).toHaveAttribute('aria-disabled', 'true')
    })

    it('Salvar e adicionar outra mantém a rua e volta o resultado para Pendente', async () => {
      const { user } = abrir({ quadra: quadraAberta })
      await user.click(screen.getByRole('radio', { name: 'Rua Ipê Amarelo' }))
      await user.type(campoNumero(), '112')
      await user.click(within(grupo()).getByRole('radio', { name: 'Estudo' }))
      await user.click(screen.getByRole('button', { name: 'Salvar e adicionar outra' }))
      expect(vi.mocked(criarCasa).mock.calls[0][2].resultado?.status).toBe('estudo')
      await waitFor(() => expect(campoNumero()).toHaveValue(''))
      expect(screen.getByRole('radio', { name: 'Rua Ipê Amarelo' })).toHaveAttribute('aria-checked', 'true')
      expect(within(grupo()).getByRole('radio', { name: 'Pendente' })).toHaveAttribute('aria-checked', 'true')
    })

    it('a aba Faixa não mostra o resultado', async () => {
      const { user } = abrir({ quadra: quadraAberta })
      await user.click(screen.getByRole('tab', { name: 'Faixa' }))
      expect(screen.queryByRole('radiogroup', { name: 'O que aconteceu' })).not.toBeInTheDocument()
    })
  })

  describe('Nova rua', () => {
    async function abrirFolha() {
      const r = abrir()
      await r.user.click(screen.getByRole('button', { name: /Nova rua/ }))
      return { ...r, folha: screen.getByRole('dialog', { name: 'Nova rua' }) }
    }

    it('salva sem espaços nas pontas; a rua vira chip e fica selecionada', async () => {
      const { user, folha } = await abrirFolha()
      await user.type(within(folha).getByLabelText('Nome da rua'), '  Rua das Palmeiras  ')
      await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
      expect(adicionarRua).toHaveBeenCalledWith('c12', 'q3', 'Rua das Palmeiras')
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Rua das Palmeiras' })).toHaveAttribute('aria-checked', 'true'))
      expect(screen.queryByRole('dialog', { name: 'Nova rua' })).not.toBeInTheDocument()
    })

    it('nome vazio não chama adicionarRua', async () => {
      const { user, folha } = await abrirFolha()
      await user.type(within(folha).getByLabelText('Nome da rua'), '   ')
      await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
      expect(adicionarRua).not.toHaveBeenCalled()
      expect(within(folha).getByRole('alert')).toBeInTheDocument()
    })

    it('nome repetido, sem diferenciar maiúsculas, não chama adicionarRua', async () => {
      const { user, folha } = await abrirFolha()
      await user.type(within(folha).getByLabelText('Nome da rua'), 'rua ipê AMARELO')
      await user.click(within(folha).getByRole('button', { name: 'Adicionar rua' }))
      expect(adicionarRua).not.toHaveBeenCalled()
      expect(within(folha).getByRole('alert')).toBeInTheDocument()
    })

    it('"Cancelar" fecha a folha sem criar nada', async () => {
      const { user, folha } = await abrirFolha()
      await user.click(within(folha).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog', { name: 'Nova rua' })).not.toBeInTheDocument()
      expect(adicionarRua).not.toHaveBeenCalled()
    })
  })

  describe('Faixa', () => {
    async function abrirFaixa() {
      const r = abrir()
      await r.user.click(screen.getByRole('tab', { name: 'Faixa' }))
      return r
    }

    it('100–106 pares chama criarCasasEmFaixa com 100, 102, 104 e 106', async () => {
      const { user, onFechar } = await abrirFaixa()
      await user.type(screen.getByLabelText('Início'), '100')
      await user.type(screen.getByLabelText('Fim'), '106')
      await user.click(screen.getByRole('radio', { name: 'Pares' }))
      expect(screen.getByText('4 casas serão criadas')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Criar 4 casas' }))
      expect(criarCasasEmFaixa).toHaveBeenCalledWith('c12', 'q3', { rua: 'Rua das Acácias', numeros: ['100', '102', '104', '106'] }, [casaA, casaB])
      expect(onFechar).toHaveBeenCalled()
    })

    it('faixa inválida desativa o botão e não cria', async () => {
      const { user } = await abrirFaixa()
      await user.type(screen.getByLabelText('Início'), '100')
      await user.type(screen.getByLabelText('Fim'), '90')
      await user.click(screen.getByRole('button', { name: /^Criar/ }))
      expect(criarCasasEmFaixa).not.toHaveBeenCalled()
    })

    it('faixa grande demais mostra o aviso e não cria', async () => {
      const { user } = await abrirFaixa()
      await user.type(screen.getByLabelText('Início'), '1')
      await user.type(screen.getByLabelText('Fim'), '500')
      expect(screen.getByRole('alert')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /^Criar/ }))
      expect(criarCasasEmFaixa).not.toHaveBeenCalled()
    })
  })
})
