import { ordenarCasas } from './ordem'
import type { Casa, Cartao } from './types'

export function deveFecharAuto(c: Pick<Cartao, 'estado' | 'totalCasas' | 'resolvidas'>): boolean {
  return c.estado === 'aberto' && c.totalCasas > 0 && c.resolvidas === c.totalCasas
}
export function fecharCartao(c: Cartao): Pick<Cartao, 'estado' | 'ciclo'> {
  return { estado: 'fechado', ciclo: c.ciclo + 1 }
}
export function abrirCartao(c: Cartao): Pick<Cartao, 'estado' | 'ciclo'> {
  return { estado: 'aberto', ciclo: c.ciclo }
}
/** Reiniciar sempre começa um ciclo novo: cartão fechado já subiu o ciclo ao fechar; cartão aberto sobe agora. */
export function reiniciarCartaoEstado(c: Pick<Cartao, 'estado' | 'ciclo'>): Pick<Cartao, 'estado' | 'ciclo'> {
  return { estado: 'aberto', ciclo: c.estado === 'aberto' ? c.ciclo + 1 : c.ciclo }
}
/** Contadores que não batem com o que o fechamento automático garante: pedem "Recalcular contadores". */
export function contadoresSuspeitos(c: Pick<Cartao, 'estado' | 'totalCasas' | 'resolvidas'>): boolean {
  return c.resolvidas > c.totalCasas || c.resolvidas < 0 || (c.estado === 'aberto' && c.totalCasas > 0 && c.resolvidas === c.totalCasas)
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
