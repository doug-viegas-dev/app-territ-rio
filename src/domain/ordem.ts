import type { Casa } from './types'

export function ordemFim(ordens: number[]): number {
  return ordens.length ? Math.max(...ordens) + 1 : 1
}
export function ordemEntre(antes: number | null, depois: number | null): number {
  if (antes === null) return depois === null ? 1 : depois - 1
  if (depois === null) return antes + 1
  return (antes + depois) / 2
}
export function precisaRenumerar(a: number, b: number): boolean { return b - a < 1e-6 }
export function ordenarCasas(casas: Casa[]): Casa[] {
  return [...casas].sort((a, b) => a.ordem - b.ordem || a.criadoEm - b.criadoEm || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
