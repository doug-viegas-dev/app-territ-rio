import { expect, it } from 'vitest'
import { abrirCartao, contadoresAposReinicio, contadoresSuspeitos, estadoAposFecharEReiniciar, fecharCartao, idsParaReiniciar, listaDeTrabalho, podeRegistrar } from './ciclo'
import type { Casa, Cartao, Status } from './types'

const cartao: Cartao = { id: '1', numero: '1', titulo: 'Cartão', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 3, atualizadoEm: 0 }
const casa = (id: string, status: Status, ordem: number, extra: Partial<Casa> = {}): Casa => ({ id, status, ordem, rua: 'Rua', criadoEm: 1, ...extra })

it('fechar não sobe o ciclo e abrir mantém', () => {
  expect(fecharCartao(cartao)).toEqual({ estado: 'fechado' })
  expect(fecharCartao({ ...cartao, ciclo: 3 })).not.toHaveProperty('ciclo')
  expect(abrirCartao(cartao)).toEqual({ estado: 'aberto', ciclo: 2 })
  expect(podeRegistrar(cartao)).toBe(true)
  expect(podeRegistrar({ estado: 'fechado' })).toBe(false)
})
it('lista de trabalho: faltam e marcadas não visitar, em ordem, sem resolvidas', () => {
  const casas = [casa('falado', 'falado', 1), casa('carta', 'carta', 2), casa('sem', 'sem_resposta', 5), casa('nao', 'falado', 3, { naoVisitar: true }), casa('pendente', 'pendente', 1), casa('nec', 'nao_em_casa', 4)]
  expect(listaDeTrabalho(casas).map((c) => c.id)).toEqual(['pendente', 'nao', 'nec', 'sem'])
})
it('ids para reiniciar: todas menos pendentes', () => {
  const casas = [casa('falado', 'falado', 1), casa('sem', 'sem_resposta', 2), casa('carta', 'carta', 3), casa('pendente', 'pendente', 4), casa('nao', 'falado', 5, { naoVisitar: true })]
  expect(idsParaReiniciar(casas)).toEqual(['falado', 'sem', 'carta', 'nao'])
})
it('contadores após reinício ignoram marcadas não visitar', () => {
  expect(contadoresAposReinicio([{}, {}, { naoVisitar: true }])).toEqual({ totalCasas: 2, faltam: 2 })
})
it('fechar e reiniciar sobe o ciclo e deixa o cartão fechado', () => {
  expect(estadoAposFecharEReiniciar({ ciclo: 3 })).toEqual({ estado: 'fechado', ciclo: 4 })
})
it('detecta contadores fora do lugar', () => {
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 2 })).toBe(false)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 6 })).toBe(true)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 5 })).toBe(false)
  expect(contadoresSuspeitos({ estado: 'fechado', totalCasas: 5, resolvidas: 5 })).toBe(false)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 0, resolvidas: 0 })).toBe(false)
})
