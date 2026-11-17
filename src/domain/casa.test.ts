import { expect, it } from 'vitest'
import { soDigitos, validarCasa } from './casa'

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
