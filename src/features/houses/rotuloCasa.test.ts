import { describe, expect, it } from 'vitest'
import { rotuloCasa } from './rotuloCasa'

describe('rotuloCasa', () => {
  it('junta número e descrição', () => {
    expect(rotuloCasa({ numero: '120', descricao: 'portão azul' })).toBe('120 · portão azul')
  })
  it('só número', () => {
    expect(rotuloCasa({ numero: '120' })).toBe('120')
  })
  it('só descrição', () => {
    expect(rotuloCasa({ descricao: 'portão azul' })).toBe('portão azul')
  })
  it('ignora campos vazios', () => {
    expect(rotuloCasa({ numero: ' ', descricao: 'portão azul' })).toBe('portão azul')
  })
})
