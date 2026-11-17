import { describe, expect, it } from 'vitest'
import type { Casa } from './types'
import { casaNova, soDigitos, validarCasa, validarEntradaRapida } from './casa'

it('exige número ou descrição e permite números repetidos', () => {
  expect(validarCasa({})).toBeTruthy()
  expect(validarCasa({ numero: '  ', descricao: '' })).toBeTruthy()
  expect(validarCasa({ numero: '120' })).toBeNull()
  expect(validarCasa({ numero: '120' })).toBeNull()
  expect(validarCasa({ descricao: 'portão azul' })).toBeNull()
})

it('o número só aceita dígitos', () => {
  expect(validarCasa({ numero: '12A' })).toBe('Use só números no campo Número.')
  expect(validarCasa({ numero: '12-4', descricao: 'portão' })).toBe('Use só números no campo Número.')
  expect(validarCasa({ numero: ' 120 ' })).toBeNull()
  expect(soDigitos('1a2 b-3')).toBe('123')
})

it('validarEntradaRapida pede número só com dígitos no modo número', () => {
  expect(validarEntradaRapida('numero', '')).toBe('Digite o número da casa.')
  expect(validarEntradaRapida('numero', '12a')).toBe('Use só números no campo Número.')
  expect(validarEntradaRapida('numero', '232')).toBeNull()
})

it('validarEntradaRapida pede descrição preenchida no modo descrição', () => {
  expect(validarEntradaRapida('descricao', '   ')).toBe('Escreva uma descrição curta.')
  expect(validarEntradaRapida('descricao', 'portão azul')).toBeNull()
})

const casa = (id: string, extra: Partial<Casa> = {}): Casa => ({ id, rua: 'Rua A', ordem: 1, status: 'pendente', criadoEm: 1, ...extra })

describe('casaNova', () => {
  const esperada = { rua: 'Rua A', numero: '232' }
  it('acha a casa com id novo que bate rua e número', () => {
    const agora = [casa('h1', { numero: '231' }), casa('h2', { numero: '232' })]
    expect(casaNova(['h1'], agora, esperada)?.id).toBe('h2')
  })
  it('ignora casa nova de outra pessoa com outro número', () => {
    expect(casaNova(['h1'], [casa('h1'), casa('h9', { numero: '999' })], esperada)).toBeUndefined()
  })
  it('com duas candidatas iguais devolve a última da lista', () => {
    const agora = [casa('h2', { numero: '232' }), casa('h3', { numero: '232' })]
    expect(casaNova([], agora, esperada)?.id).toBe('h3')
  })
  it('sem id novo devolve nada', () => {
    expect(casaNova(['h2'], [casa('h2', { numero: '232' })], esperada)).toBeUndefined()
  })
  it('compara a descrição sem espaços nas pontas e sem número', () => {
    const agora = [casa('h5', { descricao: ' Portão azul ' })]
    expect(casaNova([], agora, { rua: 'Rua A', descricao: 'Portão azul' })?.id).toBe('h5')
  })
  it('não aceita casa de outra rua', () => {
    expect(casaNova([], [casa('h6', { rua: 'Rua B', numero: '232' })], esperada)).toBeUndefined()
  })
})
