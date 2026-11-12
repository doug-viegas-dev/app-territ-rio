import type { Cartao, Quadra } from './types'

export const LIMITES = { numeroCartao: 10, tituloCartao: 80, quadra: 40, rua: 60, nomeMembro: 80, pdfBytes: 20 * 1024 * 1024 } as const

const norm = (s: string) => s.trim().toLocaleLowerCase('pt-BR')

export function validarCartao(
  d: { numero: string; titulo: string; mapsUrl?: string },
  outros: Pick<Cartao, 'id' | 'numero'>[],
  proprioId?: string,
): string | null {
  const numero = d.numero.trim()
  const titulo = d.titulo.trim()
  if (!numero) return 'Informe o número do cartão.'
  if (!titulo) return 'Informe o título do cartão.'
  if (numero.length > LIMITES.numeroCartao) return `O número pode ter até ${LIMITES.numeroCartao} caracteres.`
  if (titulo.length > LIMITES.tituloCartao) return `O título pode ter até ${LIMITES.tituloCartao} caracteres.`
  if (outros.some((o) => o.id !== proprioId && norm(o.numero) === norm(numero))) return `Já existe o cartão ${numero}.`
  const url = d.mapsUrl?.trim()
  if (url && !/^https?:\/\//i.test(url)) return 'Cole o link completo, começando com https://.'
  return null
}

export function validarQuadra(rotulo: string, outras: Pick<Quadra, 'id' | 'rotulo'>[], proprioId?: string): string | null {
  const nome = rotulo.trim()
  if (!nome) return 'Digite o nome da quadra.'
  if (nome.length > LIMITES.quadra) return `O nome pode ter até ${LIMITES.quadra} caracteres.`
  if (outras.some((o) => o.id !== proprioId && norm(o.rotulo) === norm(nome))) return 'Já existe uma quadra com esse nome.'
  return null
}

export function validarRua(nome: string, ruas: string[], atual?: string): string | null {
  const n = nome.trim()
  if (!n) return 'Digite o nome da rua.'
  if (n.length > LIMITES.rua) return `O nome pode ter até ${LIMITES.rua} caracteres.`
  if (ruas.some((r) => (atual === undefined || r !== atual) && norm(r) === norm(n))) return 'Essa rua já existe nesta quadra.'
  return null
}

export function validarNomeMembro(nome: string): string | null {
  const n = nome.trim()
  if (!n) return 'Digite o nome da pessoa.'
  if (n.length > LIMITES.nomeMembro) return `O nome pode ter até ${LIMITES.nomeMembro} caracteres.`
  return null
}

export function validarNovoMembro(d: { email: string; nome: string }, existentes: { email: string }[]): string | null {
  const email = d.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido.'
  const erroNome = validarNomeMembro(d.nome)
  if (erroNome) return erroNome
  if (existentes.some((e) => e.email.trim().toLowerCase() === email)) return 'Esse e-mail já está na lista.'
  return null
}

export function validarArquivoMapa(a: { size: number; type: string }): string | null {
  if (a.type !== 'application/pdf') return 'Escolha um arquivo PDF.'
  if (a.size > LIMITES.pdfBytes) return 'O arquivo passa de 20 MB. Escolha outro.'
  return null
}
