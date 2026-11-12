import { ordenarCasas } from './ordem'
import { contaNoTotal, faltaVisitar } from './status'
import type { Casa, Cartao } from './types'

/** Fechar não sobe o ciclo: quem sobe é o fechamento com reinício. */
export function fecharCartao(c: Cartao): Pick<Cartao, 'estado'> {
  void c
  return { estado: 'fechado' }
}
export function abrirCartao(c: Cartao): Pick<Cartao, 'estado' | 'ciclo'> {
  return { estado: 'aberto', ciclo: c.ciclo }
}
export function estadoAposFecharEReiniciar(c: Pick<Cartao, 'ciclo'>): Pick<Cartao, 'estado' | 'ciclo'> {
  return { estado: 'fechado', ciclo: c.ciclo + 1 }
}
/** Contadores fora do intervalo possível: pedem "Recalcular contadores". */
export function contadoresSuspeitos(c: Pick<Cartao, 'estado' | 'totalCasas' | 'resolvidas'>): boolean {
  return c.resolvidas > c.totalCasas || c.resolvidas < 0
}
export function podeRegistrar(c: Pick<Cartao, 'estado'>): boolean { return c.estado === 'aberto' }
/** Casas que faltam visitar e as marcadas "não visitar" (visíveis, com registro bloqueado), em ordem. */
export function listaDeTrabalho(casas: Casa[]): Casa[] {
  return ordenarCasas(casas).filter((c) => c.naoVisitar || faltaVisitar(c))
}
export function idsParaReiniciar(casas: Casa[]): string[] {
  return casas.filter((c) => c.status !== 'pendente').map((c) => c.id)
}
/** Depois do reinício todas voltam a pendente: as marcadas "não visitar" ficam fora das contas. */
export function contadoresAposReinicio(casasDaQuadra: Pick<Casa, 'naoVisitar'>[]): { totalCasas: number; faltam: number } {
  const n = casasDaQuadra.filter(contaNoTotal).length
  return { totalCasas: n, faltam: n }
}
