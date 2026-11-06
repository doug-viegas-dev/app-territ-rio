const chave = (s: string) => s.toLocaleLowerCase('pt-BR')

/** Uma rua por linha, sem linhas vazias nem repetidas (sem diferenciar maiúsculas). */
export function ruasDoTexto(texto: string): string[] {
  const ruas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  return ruas.filter((r, i) => ruas.findIndex((x) => chave(x) === chave(r)) === i)
}
