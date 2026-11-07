import { useSyncExternalStore } from 'react'
import { reiniciarBanco } from './banco'

/** Modo demonstração: tudo roda em memória neste aparelho, sem login e sem tocar no banco real. */
let ativo = false
const ouvintes = new Set<() => void>()
const avisar = () => [...ouvintes].forEach((f) => f())

export const USUARIO_DEMO = { uid: 'demo', email: 'visitante@demonstracao.app', nome: 'Visitante (demonstração)' }

export const demoAtivo = (): boolean => ativo

export function observarModoDemo(cb: () => void): () => void {
  ouvintes.add(cb)
  return () => { ouvintes.delete(cb) }
}

export function entrarNaDemo(): void {
  reiniciarBanco()
  ativo = true
  avisar()
}

export function sairDaDemo(): void {
  ativo = false
  // O endereço aberto na demo não existe fora dela: volta ao início.
  try { window.history.replaceState(null, '', '/') } catch { /* sem histórico: segue */ }
  avisar()
}

export function useDemo(): boolean {
  return useSyncExternalStore(observarModoDemo, demoAtivo)
}
