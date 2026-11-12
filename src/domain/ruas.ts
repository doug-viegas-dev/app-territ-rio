import type { Casa, Quadra } from './types'

export function mesmaRua(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR')
}

/** Ruas da quadra, depois as que só existem nas casas (comparação exata), sem repetir. */
export function ruasDaQuadra(quadra: Pick<Quadra, 'ruas'>, casas: Pick<Casa, 'rua'>[]): string[] {
  const vistas = new Set<string>()
  const saida: string[] = []
  for (const r of [...quadra.ruas, ...casas.map((c) => c.rua)]) {
    if (!vistas.has(r)) { vistas.add(r); saida.push(r) }
  }
  return saida
}

export function renomearRuaNaLista(ruas: string[], de: string, para: string): string[] {
  const temDe = ruas.includes(de)
  const base = temDe ? ruas.map((r) => (r === de ? para : r)) : [...ruas, para]
  return base.filter((r, i) => base.indexOf(r) === i)
}
