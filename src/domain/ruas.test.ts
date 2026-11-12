import { describe, expect, it } from 'vitest'
import { mesmaRua, renomearRuaNaLista, ruasDaQuadra } from './ruas'

describe('ruas', () => {
  it('mesmaRua ignora espaços e maiúsculas', () => expect(mesmaRua(' Rua Á ', 'rua á')).toBe(true))
  it('ruasDaQuadra junta as da quadra e as só das casas', () => {
    expect(ruasDaQuadra({ ruas: ['A', 'B'] }, [{ rua: 'B' }, { rua: 'C' }, { rua: 'C' }, { rua: 'a' }])).toEqual(['A', 'B', 'C', 'a'])
  })
  it('renomearRuaNaLista', () => {
    expect(renomearRuaNaLista(['A', 'B'], 'A', 'C')).toEqual(['C', 'B'])
    expect(renomearRuaNaLista(['B'], 'A', 'C')).toEqual(['B', 'C'])
    expect(renomearRuaNaLista(['A', 'C'], 'A', 'C')).toEqual(['C'])
  })
})
