import { describe, expect, it } from 'vitest'
import { validarArquivoMapa, validarCartao, validarNomeMembro, validarNovoMembro, validarQuadra, validarRua } from './validacao'

describe('validarCartao', () => {
  const ok = { numero: '1', titulo: 'Centro' }
  it('exige número e título', () => {
    expect(validarCartao({ numero: '', titulo: 'x' }, [])).toBe('Informe o número do cartão.')
    expect(validarCartao({ numero: '1', titulo: '  ' }, [])).toBe('Informe o título do cartão.')
  })
  it('respeita os limites', () => {
    expect(validarCartao({ numero: '12345678901', titulo: 'x' }, [])).toBe('O número pode ter até 10 caracteres.')
    expect(validarCartao({ numero: '1234567890', titulo: 'x' }, [])).toBeNull()
    expect(validarCartao({ numero: '1', titulo: 'a'.repeat(81) }, [])).toBe('O título pode ter até 80 caracteres.')
  })
  it('detecta número repetido, exceto o próprio', () => {
    const outros = [{ id: 'a', numero: '12' }]
    expect(validarCartao({ numero: ' 12 ', titulo: 'x' }, outros)).toBe('Já existe o cartão 12.')
    expect(validarCartao({ numero: ' 12 ', titulo: 'x' }, outros, 'a')).toBeNull()
    expect(validarCartao({ numero: '12', titulo: 'x' }, [{ id: 'a', numero: '12A' }])).toBeNull()
  })
  it('valida o link', () => {
    expect(validarCartao({ ...ok, mapsUrl: 'maps.app/x' }, [])).toBe('Cole o link completo, começando com https://.')
    for (const u of ['https://maps.app/x', 'http://x', undefined, '']) expect(validarCartao({ ...ok, mapsUrl: u }, [])).toBeNull()
  })
})
describe('validarQuadra', () => {
  it('valida', () => {
    expect(validarQuadra('', [])).toBe('Digite o nome da quadra.')
    expect(validarQuadra('a'.repeat(41), [])).toBe('O nome pode ter até 40 caracteres.')
    const outras = [{ id: 'q1', rotulo: 'Quadra 1' }]
    expect(validarQuadra('quadra 1', outras)).toBe('Já existe uma quadra com esse nome.')
    expect(validarQuadra('quadra 1', outras, 'q1')).toBeNull()
  })
})
describe('validarRua', () => {
  it('valida', () => {
    expect(validarRua('', [])).toBe('Digite o nome da rua.')
    expect(validarRua('a'.repeat(61), [])).toBe('O nome pode ter até 60 caracteres.')
    expect(validarRua('rua a', ['Rua A'])).toBe('Essa rua já existe nesta quadra.')
    expect(validarRua('rua a', ['Rua A'], 'Rua A')).toBeNull()
    expect(validarRua('Rua B', ['Rua A', 'Rua B'], 'Rua A')).toBe('Essa rua já existe nesta quadra.')
  })
})
describe('membros', () => {
  it('validarNomeMembro', () => {
    expect(validarNomeMembro('')).toBe('Digite o nome da pessoa.')
    expect(validarNomeMembro('a'.repeat(81))).toBe('O nome pode ter até 80 caracteres.')
    expect(validarNomeMembro('Ana')).toBeNull()
  })
  it('validarNovoMembro na ordem e-mail, nome, duplicado', () => {
    expect(validarNovoMembro({ email: 'sem-arroba', nome: '' }, [])).toBe('Digite um e-mail válido.')
    expect(validarNovoMembro({ email: 'a@b.com', nome: '' }, [])).toBe('Digite o nome da pessoa.')
    expect(validarNovoMembro({ email: 'ANA@gmail.com', nome: 'Ana' }, [{ email: 'ana@gmail.com' }])).toBe('Esse e-mail já está na lista.')
    expect(validarNovoMembro({ email: 'novo@gmail.com', nome: 'Ana' }, [{ email: 'ana@gmail.com' }])).toBeNull()
  })
})
describe('validarArquivoMapa', () => {
  it('valida tipo e tamanho', () => {
    expect(validarArquivoMapa({ type: 'image/png', size: 1 })).toBe('Escolha um arquivo PDF.')
    expect(validarArquivoMapa({ type: 'application/pdf', size: 20 * 1024 * 1024 + 1 })).toBe('O arquivo passa de 20 MB. Escolha outro.')
    expect(validarArquivoMapa({ type: 'application/pdf', size: 20 * 1024 * 1024 })).toBeNull()
  })
})
