import type { Casa } from './types'

export type CasaConta = Pick<Casa, 'status' | 'naoVisitar'>
type Contribuicao = { total: 0 | 1; resolvidas: 0 | 1; faltam: 0 | 1 }

/** Casa marcada "não visitar" não existe para as contas. */
export function contaNoTotal(c: Pick<Casa, 'naoVisitar'>): boolean { return !c.naoVisitar }
export function isResolvida(c: CasaConta): boolean {
  return contaNoTotal(c) && (c.status === 'falado' || c.status === 'carta')
}
export function faltaVisitar(c: CasaConta): boolean {
  return contaNoTotal(c) && !isResolvida(c)
}
export function contribuicao(c: CasaConta | null): Contribuicao {
  if (!c || !contaNoTotal(c)) return { total: 0, resolvidas: 0, faltam: 0 }
  const resolvida = isResolvida(c)
  return { total: 1, resolvidas: resolvida ? 1 : 0, faltam: resolvida ? 0 : 1 }
}
export function deltaContadores(antes: CasaConta | null, depois: CasaConta | null): { total: number; resolvidas: number; faltam: number } {
  const a = contribuicao(antes)
  const d = contribuicao(depois)
  return { total: d.total - a.total, resolvidas: d.resolvidas - a.resolvidas, faltam: d.faltam - a.faltam }
}
