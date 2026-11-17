import type { Casa } from './types'

/** Só dígitos: o campo Número não aceita letras, espaços nem símbolos. */
export const soDigitos = (s: string): string => s.replace(/\D/g, '')

export function validarCasa(d: { numero?: string; descricao?: string }): string | null {
  const numero = d.numero?.trim() ?? ''
  if (numero && soDigitos(numero) !== numero) return 'Use só números no campo Número.'
  return numero || d.descricao?.trim() ? null : 'Informe o número ou uma descrição.'
}

/** Campo único do cadastro rápido na quadra: número (só dígitos) ou, sem número, uma descrição curta. */
export function validarEntradaRapida(modo: 'numero' | 'descricao', texto: string): string | null {
  const limpo = texto.trim()
  if (modo === 'descricao') return limpo ? null : 'Escreva uma descrição curta.'
  if (!limpo) return 'Digite o número da casa.'
  return soDigitos(limpo) === limpo ? null : 'Use só números no campo Número.'
}

/** A casa que acabou de ser cadastrada aqui: id que não existia antes, mesma rua e mesmo número/descrição. A última, se houver mais de uma. */
export function casaNova(antes: string[], agora: Casa[], esperada: { rua: string; numero?: string; descricao?: string }): Casa | undefined {
  const igual = (a?: string, b?: string) => (a ?? '').trim() === (b ?? '').trim()
  return [...agora].reverse().find((c) => !antes.includes(c.id) && c.rua === esperada.rua && igual(c.numero, esperada.numero) && igual(c.descricao, esperada.descricao))
}
