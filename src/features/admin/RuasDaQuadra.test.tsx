import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import type { Casa, Quadra } from '@/domain/types'
import { removerRua, renomearRua, RenomeacaoIncompleta } from '@/firebase/blocks'
import { useCasas } from '@/features/houses/useCasas'
import { RuasDaQuadra } from './RuasDaQuadra'

vi.mock('@/firebase/blocks', () => {
  class RenomeacaoIncompleta extends Error {
    causa: unknown
    constructor(c: unknown) { super('x'); this.causa = c }
  }
  return { removerRua: vi.fn(), renomearRua: vi.fn(), RenomeacaoIncompleta }
})
vi.mock('@/features/houses/useCasas', () => ({ useCasas: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))

const quadra: Quadra = { id: 'q1', rotulo: 'Quadra 1', ruas: ['Rua A', 'Rua B'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 }
const casa = (id: string, rua: string) => ({ id, rua }) as Casa

async function abrirRenomear(user: ReturnType<typeof userEvent.setup>, rua: string, novo: string) {
  await user.click(screen.getByRole('button', { name: `Renomear ${rua}` }))
  const folha = screen.getByRole('dialog')
  const campo = within(folha).getByLabelText('Nome da rua')
  await user.clear(campo)
  if (novo) await user.type(campo, novo)
  await user.click(within(folha).getByRole('button', { name: 'Renomear' }))
  return folha
}

describe('RuasDaQuadra', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(useCasas).mockReturnValue([casa('1', 'Rua A'), casa('2', 'Rua Solta')])
    vi.mocked(removerRua).mockResolvedValue()
    vi.mocked(renomearRua).mockResolvedValue({ casas: 1 })
  })
  afterEach(cleanup)

  it('lista a união das ruas da quadra com as das casas', () => {
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    for (const r of ['Rua A', 'Rua B', 'Rua Solta']) expect(screen.getByText(r)).toBeTruthy()
  })

  it('rua com casas: Remover desabilitado com o texto', () => {
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    expect(screen.getByRole('button', { name: 'Remover Rua A' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getAllByText(TEXTOS_BLOQUEIO['rua.casas']).length).toBeGreaterThan(0)
  })

  it('rua sem casas: confirma e remove', async () => {
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    await user.click(screen.getByRole('button', { name: 'Remover Rua B' }))
    const folha = screen.getByRole('dialog')
    expect(document.activeElement).toBe(within(folha).getByRole('button', { name: 'Cancelar' }))
    await user.click(within(folha).getByRole('button', { name: /^Remover Rua B/ }))
    expect(removerRua).toHaveBeenCalledWith('c1', 'q1', 'Rua B')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ExclusaoBloqueada vinda do servidor mostra o texto', async () => {
    vi.mocked(removerRua).mockRejectedValue(new ExclusaoBloqueada('casas'))
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    await user.click(screen.getByRole('button', { name: 'Remover Rua B' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Remover Rua B/ }))
    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_BLOQUEIO['rua.casas'])
  })

  it('Renomear abre com o nome atual e chama renomearRua', async () => {
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    await user.click(screen.getByRole('button', { name: 'Renomear Rua A' }))
    expect((within(screen.getByRole('dialog')).getByLabelText('Nome da rua') as HTMLInputElement).value).toBe('Rua A')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await abrirRenomear(user, 'Rua A', 'Rua C')
    expect(renomearRua).toHaveBeenCalledWith('c1', 'q1', 'Rua A', 'Rua C')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each([
    ['', 'Digite o nome da rua.'],
    ['rua b', 'Essa rua já existe nesta quadra.'],
    ['x'.repeat(61), 'O nome pode ter até 60 caracteres.'],
  ])('nome %#: erro sem chamar renomearRua', async (nome, msg) => {
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    const folha = await abrirRenomear(user, 'Rua A', nome)
    expect(within(folha).getByRole('alert').textContent).toContain(msg)
    expect(renomearRua).not.toHaveBeenCalled()
  })

  it('trocar só maiúsculas é aceito', async () => {
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    await abrirRenomear(user, 'Rua A', 'RUA A')
    expect(renomearRua).toHaveBeenCalledWith('c1', 'q1', 'Rua A', 'RUA A')
  })

  it('RenomeacaoIncompleta e outros erros têm textos próprios', async () => {
    const user = userEvent.setup()
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    vi.mocked(renomearRua).mockRejectedValueOnce(new RenomeacaoIncompleta(new Error('x')))
    await abrirRenomear(user, 'Rua A', 'Rua C')
    expect((await screen.findByRole('alert')).textContent).toContain('Parte das casas foi atualizada. Toque em Renomear de novo para terminar.')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    vi.mocked(renomearRua).mockRejectedValueOnce(new Error('falha'))
    await abrirRenomear(user, 'Rua A', 'Rua C')
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível renomear a rua. Tente de novo.')
  })

  it('sem rede, Renomear e Remover ficam desabilitados com o texto', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    render(<RuasDaQuadra cartaoId="c1" quadra={quadra} />)
    expect(screen.getByRole('button', { name: 'Renomear Rua B' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Remover Rua B' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getAllByText('Precisa de internet.').length).toBeGreaterThan(0)
  })
})
