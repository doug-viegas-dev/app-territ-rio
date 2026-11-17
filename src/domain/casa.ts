/** Só dígitos: o campo Número não aceita letras, espaços nem símbolos. */
export const soDigitos = (s: string): string => s.replace(/\D/g, '')

export function validarCasa(d: { numero?: string; descricao?: string }): string | null {
  const numero = d.numero?.trim() ?? ''
  if (numero && soDigitos(numero) !== numero) return 'Use só números no campo Número.'
  return numero || d.descricao?.trim() ? null : 'Informe o número ou uma descrição.'
}
