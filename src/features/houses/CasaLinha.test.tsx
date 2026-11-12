import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Casa } from '@/domain/types'
import CasaLinha from './CasaLinha'

const base: Casa = { id: 'h1', rua: 'Rua das Acácias', numero: '10', ordem: 1, status: 'pendente', criadoEm: 1 }

describe('CasaLinha', () => {
  afterEach(cleanup)

  it('casa com naoVisitar tem a classe fora e o selo', () => {
    render(<CasaLinha casa={{ ...base, naoVisitar: true }} foco={false} onSelecionar={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveClass('fora')
    expect(screen.getByText('Não visitar')).toBeInTheDocument()
  })

  it('casa comum não tem a classe fora nem selo', () => {
    render(<CasaLinha casa={base} foco={false} onSelecionar={vi.fn()} />)
    expect(screen.getByRole('button')).not.toHaveClass('fora')
    expect(screen.queryByText('Não visitar')).not.toBeInTheDocument()
    expect(screen.queryByText('Estudo')).not.toBeInTheDocument()
  })

  it('casa com estudo mostra o selo Estudo', () => {
    render(<CasaLinha casa={{ ...base, estudo: true }} foco={false} onSelecionar={vi.fn()} />)
    expect(screen.getByText('Estudo')).toBeInTheDocument()
  })
})
