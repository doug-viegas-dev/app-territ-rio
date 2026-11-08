import { ordenarCasas } from './ordem'
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
export function listaDeTrabalho(casas: Casa[]): { pendentes: Casa[]; destacadas: Casa[] } {
  const ordenadas = ordenarCasas(casas)
  return {
    pendentes: ordenadas.filter((c) => c.status === 'pendente' || c.status === 'sem_resposta'),
    destacadas: ordenadas.filter((c) => c.status === 'estudo' || c.status === 'nao_visitar'),
  }
}
export function idsParaReiniciar(casas: Casa[]): string[] {
  return casas.filter((c) => c.status !== 'nao_visitar' && c.status !== 'pendente').map((c) => c.id)
}
