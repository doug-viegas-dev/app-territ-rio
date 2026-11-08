import type { Status } from './types'

export function isResolvida(s: Status): boolean {
  return s === 'falado' || s === 'estudo' || s === 'nao_visitar'
}
export function deltaResolvidas(antes: Status, depois: Status): -1 | 0 | 1 {
  if (isResolvida(antes) === isResolvida(depois)) return 0
  return isResolvida(depois) ? 1 : -1
}
export function faltaVisitar(s: Status): boolean {
  return s === 'pendente' || s === 'sem_resposta'
}
export function deltaFaltam(antes: Status, depois: Status): -1 | 0 | 1 {
  if (faltaVisitar(antes) === faltaVisitar(depois)) return 0
  return faltaVisitar(depois) ? 1 : -1
}
