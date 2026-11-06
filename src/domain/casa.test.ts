import { expect, it } from 'vitest'
import { validarCasa } from './casa'

it('exige número ou descrição e permite números repetidos', () => {
  expect(validarCasa({})).toBeTruthy()
  expect(validarCasa({ numero: '  ', descricao: '' })).toBeTruthy()
  expect(validarCasa({ numero: '120' })).toBeNull()
  expect(validarCasa({ numero: '120' })).toBeNull()
  expect(validarCasa({ descricao: 'portão azul' })).toBeNull()
})
