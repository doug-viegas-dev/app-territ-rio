/** Registro do histórico vale por 2 anos de calendário. */
export function vencimentoDoRegistro(em: number): number {
  const d = new Date(em)
  d.setFullYear(d.getFullYear() + 2)
  return d.getTime()
}
export function aindaNoHistorico(v: { em: number; expiraEm?: number }, agora: number): boolean {
  return (v.expiraEm ?? vencimentoDoRegistro(v.em)) > agora
}
