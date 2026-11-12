import { describe, expect, it } from 'vitest'
import { trocarOrdem } from './quadras'

const qs = [{ id: 'c', ordem: 3 }, { id: 'a', ordem: 1 }, { id: 'b', ordem: 2 }]
describe('trocarOrdem', () => {
  it('sobe e desce', () => {
    expect(trocarOrdem(qs, 'b', 'subir')).toEqual([{ id: 'b', ordem: 1 }, { id: 'a', ordem: 2 }])
    expect(trocarOrdem(qs, 'b', 'descer')).toEqual([{ id: 'b', ordem: 3 }, { id: 'c', ordem: 2 }])
  })
  it('devolve null nos limites e para id inexistente', () => {
    expect(trocarOrdem(qs, 'a', 'subir')).toBeNull()
    expect(trocarOrdem(qs, 'c', 'descer')).toBeNull()
    expect(trocarOrdem(qs, 'x', 'subir')).toBeNull()
  })
})
