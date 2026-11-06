import { expect, it } from 'vitest'
import { abrirCartao, contadoresSuspeitos, deveFecharAuto, fecharCartao, idsParaReiniciar, listaDeTrabalho, podeRegistrar, reiniciarCartaoEstado } from './ciclo'
import type { Casa, Cartao, Status } from './types'

const cartao: Cartao = { id: '1', numero: '1', titulo: 'Cartão', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 3, atualizadoEm: 0 }
const casa = (id: string, status: Status, ordem: number): Casa => ({ id, status, ordem, rua: 'Rua', criadoEm: 1 })

it('fecha automaticamente só cartão aberto com casas todas resolvidas', () => {
  expect(deveFecharAuto({ estado: 'aberto', totalCasas: 0, resolvidas: 0 })).toBe(false)
  expect(deveFecharAuto(cartao)).toBe(true)
  expect(deveFecharAuto({ ...cartao, estado: 'fechado' })).toBe(false)
  expect(deveFecharAuto({ ...cartao, resolvidas: 2 })).toBe(false)
})
it('mantém o ciclo ao abrir e incrementa ao fechar', () => {
  expect(fecharCartao(cartao)).toEqual({ estado: 'fechado', ciclo: 3 })
  expect(abrirCartao(cartao)).toEqual({ estado: 'aberto', ciclo: 2 })
  expect(podeRegistrar(cartao)).toBe(true)
  expect(podeRegistrar({ estado: 'fechado' })).toBe(false)
})
it('separa e ordena a lista de trabalho e seleciona casas para reinício', () => {
  const casas = [casa('falado', 'falado', 1), casa('estudo', 'estudo', 4), casa('sem', 'sem_resposta', 3), casa('nao', 'nao_visitar', 2), casa('pendente', 'pendente', 1)]
  const lista = listaDeTrabalho(casas)
  expect(lista.pendentes.map((c) => c.id)).toEqual(['pendente', 'sem'])
  expect(lista.destacadas.map((c) => c.id)).toEqual(['nao', 'estudo'])
  expect(idsParaReiniciar(casas)).toEqual(['falado', 'estudo', 'sem'])
})
it('reiniciar sempre abre um ciclo novo', () => {
  expect(reiniciarCartaoEstado({ estado: 'fechado', ciclo: 3 })).toEqual({ estado: 'aberto', ciclo: 3 })
  expect(reiniciarCartaoEstado({ estado: 'aberto', ciclo: 3 })).toEqual({ estado: 'aberto', ciclo: 4 })
})
it('detecta contadores fora do lugar', () => {
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 2 })).toBe(false)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 6 })).toBe(true)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 5 })).toBe(true)
  expect(contadoresSuspeitos({ estado: 'fechado', totalCasas: 5, resolvidas: 5 })).toBe(false)
  expect(contadoresSuspeitos({ estado: 'aberto', totalCasas: 0, resolvidas: 0 })).toBe(false)
})
