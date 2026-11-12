import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Casa } from '@/domain/types'
import { moverCasa } from '@/firebase/houses'
import ReordenarLista from './ReordenarLista'

vi.mock('@/firebase/houses', () => ({ moverCasa: vi.fn() }))

const c = (id: string, ordem: number, rua = 'Rua das Acácias'): Casa => ({ id, rua, numero: id, ordem, status: 'pendente', criadoEm: ordem })
const [a, b, d] = [c('100', 1), c('104', 2), c('108', 3)]
const outra = c('24', 1, 'Rua Ipê Amarelo')
const ruas = ['Rua das Acácias', 'Rua Ipê Amarelo']

function abrir(casas: Casa[] = [a, b, d], ruasDaQuadra = ruas) {
  const onAdicionarDepois = vi.fn()
  render(<ReordenarLista casas={casas} ruas={ruasDaQuadra} cartaoId="c12" quadraId="q3" onAdicionarDepois={onAdicionarDepois} />)
  return { onAdicionarDepois, user: userEvent.setup() }
}

describe('ReordenarLista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(moverCasa).mockResolvedValue()
  })
  afterEach(cleanup)

  it('não há alça nem setas: a linha toda é arrastada', () => {
    abrir()
    expect(screen.queryAllByLabelText(/^Arrastar /)).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /^(Subir|Descer) / })).toHaveLength(0)
    expect(screen.getByText(/Segure uma casa e arraste/)).toBeInTheDocument()
  })

  it('agrupa por rua', () => {
    abrir([a, b, outra])
    expect(screen.getByRole('heading', { name: /Rua Ipê Amarelo/ })).toBeInTheDocument()
  })

  it('"Adicionar depois desta" entrega a casa a quem abriu a lista', async () => {
    const { user, onAdicionarDepois } = abrir()
    await user.click(screen.getByRole('button', { name: /^104/ }))
    await user.click(screen.getByRole('button', { name: 'Adicionar depois desta' }))
    expect(onAdicionarDepois).toHaveBeenCalledWith(b)
  })

  it('"Mover para outra rua" põe a casa no fim da rua escolhida', async () => {
    const { user } = abrir([a, b, outra])
    await user.click(screen.getByRole('button', { name: /^100/ }))
    await user.click(screen.getByRole('button', { name: 'Mover para outra rua' }))
    const folha = screen.getByRole('dialog', { name: 'Mover para outra rua' })
    expect(within(folha).getByRole('radio', { name: 'Rua Ipê Amarelo' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(folha).getByRole('button', { name: 'Mover' }))
    expect(moverCasa).toHaveBeenCalledWith('c12', 'q3', '100', { rua: 'Rua Ipê Amarelo', antes: outra, depois: null }, [a, b, outra])
    expect(screen.queryByRole('dialog', { name: 'Mover para outra rua' })).not.toBeInTheDocument()
  })

  it('"Cancelar" fecha a folha sem mover', async () => {
    const { user } = abrir([a, b, outra])
    await user.click(screen.getByRole('button', { name: /^100/ }))
    await user.click(screen.getByRole('button', { name: 'Mover para outra rua' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(moverCasa).not.toHaveBeenCalled()
  })

  it('com uma rua só não oferece "Mover para outra rua"', async () => {
    const { user } = abrir([a, b, d], ['Rua das Acácias'])
    await user.click(screen.getByRole('button', { name: /^100/ }))
    expect(screen.getByRole('button', { name: 'Adicionar depois desta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover para outra rua' })).not.toBeInTheDocument()
  })
})
