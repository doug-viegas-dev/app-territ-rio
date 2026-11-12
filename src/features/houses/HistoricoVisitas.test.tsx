import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Visita } from '@/domain/types'
import HistoricoVisitas from './HistoricoVisitas'

const base = { em: new Date(2026, 10, 2).getTime(), porUid: 'u1', porNome: 'Marcos S.', ciclo: 1 }

describe('HistoricoVisitas', () => {
  afterEach(cleanup)

  it('visita sem status aparece como "Observação" com o texto', () => {
    const v: Visita = { id: 'a', ...base, obs: 'Voltar à tarde.' }
    render(<HistoricoVisitas visitas={[v]} />)
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Observação')
    expect(item).toHaveTextContent('Voltar à tarde.')
    expect(item).toHaveTextContent('02/11/2026 · Marcos S.')
  })

  it('visita legada com status estudo aparece como "Estudo"', () => {
    render(<HistoricoVisitas visitas={[{ id: 'b', ...base, status: 'estudo' }]} />)
    expect(screen.getByRole('listitem')).toHaveTextContent('Estudo')
  })

  it('a volta aparece como "Volta N"', () => {
    render(<HistoricoVisitas visitas={[{ id: 'c', ...base, status: 'falado', rodada: 2 }]} />)
    expect(screen.getByRole('listitem')).toHaveTextContent('Volta 2')
    expect(screen.getByRole('listitem')).not.toHaveTextContent('Rodada')
  })
})
