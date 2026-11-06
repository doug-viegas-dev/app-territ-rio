import { expect, it } from 'vitest'
import { gerarFaixa } from './faixa'

it('gera números crescentes pela paridade', () => {
  expect(gerarFaixa(100, 106, 'pares')).toEqual(['100', '102', '104', '106'])
  expect(gerarFaixa(100, 106, 'impares')).toEqual(['101', '103', '105'])
  expect(gerarFaixa(1, 3, 'todos')).toEqual(['1', '2', '3'])
  expect(gerarFaixa(5, 1, 'todos')).toEqual([])
})
it('limita a faixa a 200 itens gerados', () => {
  expect(gerarFaixa(1, 200, 'todos')).toHaveLength(200)
  expect(() => gerarFaixa(1, 500, 'todos')).toThrow('Faixa grande demais')
  expect(gerarFaixa(1, 400, 'pares')).toHaveLength(200)
})

it('recusa limites que não são inteiros finitos', () => {
  expect(() => gerarFaixa(0.5, 10, 'pares')).toThrow()
  expect(() => gerarFaixa(1, Infinity, 'todos')).toThrow()
})
