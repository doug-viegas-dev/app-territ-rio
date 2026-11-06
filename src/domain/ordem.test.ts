import { expect, it } from 'vitest'
import { ordemEntre, ordemFim, ordenarCasas, precisaRenumerar } from './ordem'
import type { Casa } from './types'

it('calcula posições e detecta intervalos pequenos', () => {
  expect(ordemFim([])).toBe(1)
  expect(ordemFim([1, 3])).toBe(4)
  expect(ordemEntre(1, 2)).toBe(1.5)
  expect(ordemEntre(null, 2)).toBeLessThan(2)
  expect(ordemEntre(3, null)).toBeGreaterThan(3)
  expect(ordemEntre(null, null)).toBe(1)
  expect(precisaRenumerar(1, 1.0000001)).toBe(true)
  expect(precisaRenumerar(1, 2)).toBe(false)
})
it('ordena empates por criação e id, sem alterar a entrada', () => {
  const casa = (id: string, criadoEm: number): Casa => ({ id, criadoEm, rua: 'Rua', ordem: 1, status: 'pendente' })
  const entrada = [casa('c', 2), casa('b', 1), casa('a', 1)]
  expect(ordenarCasas(entrada).map((c) => c.id)).toEqual(['a', 'b', 'c'])
  expect(ordenarCasas(entrada)).toEqual(ordenarCasas(entrada))
  expect(entrada.map((c) => c.id)).toEqual(['c', 'b', 'a'])
})
