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

  it('"Descer" na primeira casa move para entre a segunda e a terceira', async () => {
    const { user } = abrir()
    await user.click(screen.getByRole('button', { name: 'Descer 100' }))
    expect(moverCasa).toHaveBeenCalledWith('c12', 'q3', '100', { rua: 'Rua das Acácias', antes: b, depois: d }, [a, b, d])
  })

  it('"Subir" na última casa move para entre a primeira e a segunda', async () => {
    const { user } = abrir()
    await user.click(screen.getByRole('button', { name: 'Subir 108' }))
    expect(moverCasa).toHaveBeenCalledWith('c12', 'q3', '108', { rua: 'Rua das Acácias', antes: a, depois: b }, [a, b, d])
  })

  it('"Subir" na primeira casa está desativado e não move', async () => {
    const { user } = abrir()
    const subir = screen.getByRole('button', { name: 'Subir 100' })
    expect(subir).toHaveAttribute('aria-disabled', 'true')
    await user.click(subir)
    expect(moverCasa).not.toHaveBeenCalled()
  })

  it('"Descer" na última casa está desativado', () => {
    abrir()
    expect(screen.getByRole('button', { name: 'Descer 108' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('cada casa tem uma alça de arrastar', () => {
    abrir()
    expect(screen.getAllByLabelText(/^Arrastar /)).toHaveLength(3)
  })

  it('agrupa por rua e só mexe nas casas da própria rua', async () => {
    const { user } = abrir([a, b, outra])
    expect(screen.getByRole('heading', { name: /Rua Ipê Amarelo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir 24' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Descer 24' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('button', { name: 'Descer 100' }))
    expect(moverCasa).toHaveBeenCalledWith('c12', 'q3', '100', { rua: 'Rua das Acácias', antes: b, depois: null }, [a, b, outra])
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
