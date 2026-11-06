export function validarCasa(d: { numero?: string; descricao?: string }): string | null {
  return d.numero?.trim() || d.descricao?.trim() ? null : 'Informe o número ou uma descrição.'
}
