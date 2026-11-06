import { describe, expect, it } from 'vitest'
import type { Casa } from '@/domain/types'
import { destinoDoMovimento } from './destinoDoMovimento'

const c = (id: string, ordem: number): Casa => ({ id, rua: 'Rua A', numero: id, ordem, status: 'pendente', criadoEm: ordem })
const [a, b, d] = [c('a', 1), c('b', 2), c('c', 3)]

describe('destinoDoMovimento', () => {
  it('mover a primeira para o fim: fica depois da última', () => {
    expect(destinoDoMovimento([a, b, d], 'a', 2)).toEqual({ antes: d, depois: null })
  })

  it('mover a última para o início: fica antes da primeira', () => {
    expect(destinoDoMovimento([a, b, d], 'c', 0)).toEqual({ antes: null, depois: a })
  })

  it('mover para o meio: vizinhas depois de tirar a casa movida', () => {
    expect(destinoDoMovimento([a, b, d], 'a', 1)).toEqual({ antes: b, depois: d })
  })

  it('índice fora do limite é ajustado', () => {
    expect(destinoDoMovimento([a, b, d], 'b', 99)).toEqual({ antes: d, depois: null })
    expect(destinoDoMovimento([a, b, d], 'b', -3)).toEqual({ antes: null, depois: a })
  })

  it('rua com uma casa só não tem vizinhas', () => {
    expect(destinoDoMovimento([a], 'a', 0)).toEqual({ antes: null, depois: null })
  })
})
