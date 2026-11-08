/**
 * Dados de teste para os emuladores. Escreve direto na REST do emulador do Firestore
 * com o token "owner", que ignora as regras de segurança.
 */
const PROJETO = 'demo-meu-territorio'
// Portas padrão do firebase.json; E2E_*_PORT troca quando elas já estão em uso.
const FIRESTORE = `http://127.0.0.1:${process.env.E2E_FIRESTORE_PORT ?? '8080'}`
const AUTH = `http://127.0.0.1:${process.env.E2E_AUTH_PORT ?? '9099'}`
const RAIZ = `${FIRESTORE}/v1/projects/${PROJETO}/databases/(default)/documents`
const CABECALHO = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

export const ADMIN = { email: 'ana.admin@teste.com', nome: 'Ana Admin' }
export const PUBLICADOR = { email: 'paulo.pub@teste.com', nome: 'Paulo Publicador' }
export const DESCONHECIDO = { email: 'carlos.fora@teste.com', nome: 'Carlos Fora' }

export const CARTAO_ABERTO = 'c-aberto'
export const CARTAO_QUASE = 'c-quase'
export const CARTAO_FECHADO = 'c-fechado'

type Valor = string | number | boolean | Date | Valor[] | { [k: string]: Valor }

function codificar(v: Valor): unknown {
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(codificar) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, codificar(x)])) } }
}

async function gravar(caminho: string, dados: Record<string, Valor>) {
  const fields = Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, codificar(v)]))
  const r = await fetch(`${RAIZ}/${caminho}`, { method: 'PATCH', headers: CABECALHO, body: JSON.stringify({ fields }) })
  if (!r.ok) throw new Error(`seed ${caminho}: ${r.status} ${await r.text()}`)
}

type Campos = Record<string, Record<string, unknown>>

function decodificar(v: Record<string, unknown>): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return ((v.arrayValue as { values?: Record<string, unknown>[] }).values ?? []).map(decodificar)
  if ('mapValue' in v) return lerCampos((v.mapValue as { fields?: Campos }).fields ?? {})
  return null
}

const lerCampos = (f: Campos) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decodificar(v)]))

export type Doc = Record<string, unknown> & { _id: string }

const paraDoc = (d: { name: string; fields?: Campos }): Doc => ({ ...lerCampos(d.fields ?? {}), _id: d.name.split('/').pop() as string })

/** Lê um documento (ou `null`). */
export async function lerDoc(caminho: string): Promise<Doc | null> {
  const r = await fetch(`${RAIZ}/${caminho}`, { headers: CABECALHO })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`ler ${caminho}: ${r.status}`)
  return paraDoc((await r.json()) as { name: string; fields?: Campos })
}

/** Lê os documentos de uma coleção (vazio se não existir). */
export async function lerColecao(caminho: string): Promise<Doc[]> {
  const r = await fetch(`${RAIZ}/${caminho}?pageSize=300`, { headers: CABECALHO })
  if (!r.ok) throw new Error(`ler ${caminho}: ${r.status}`)
  const j = (await r.json()) as { documents?: { name: string; fields?: Campos }[] }
  return (j.documents ?? []).map(paraDoc)
}

export async function limparTudo() {
  const a = await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' })
  const b = await fetch(`${AUTH}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' })
  if (!a.ok || !b.ok) throw new Error('Não foi possível limpar os emuladores. Eles estão rodando?')
}

const AGORA = new Date('2026-11-01T12:00:00Z')

async function cartao(id: string, d: { numero: string; titulo: string; estado: 'aberto' | 'fechado'; ciclo: number; total: number; resolvidas: number }) {
  await gravar(`cards/${id}`, {
    numero: d.numero,
    titulo: d.titulo,
    estado: d.estado,
    ciclo: d.ciclo,
    totalCasas: d.total,
    resolvidas: d.resolvidas,
    atualizadoEm: AGORA,
  })
}

type QuadraSeed = { total: number; faltam: number; rodadasTotal: number; rodadaAtual?: { id: string; numero: number; porNome: string; em: number } }

async function quadra(cartaoId: string, id: string, rotulo: string, ruas: string[], c: QuadraSeed) {
  const { total, rodadaAtual, ...resto } = c
  await gravar(`cards/${cartaoId}/blocks/${id}`, { rotulo, ruas, ordem: 1, totalCasas: total, ...resto, ...(rodadaAtual && { rodadaAtual }) })
}

type CasaSeed = { id: string; rua: string; numero?: string; descricao?: string; ordem: number; status: string }

async function casas(cartaoId: string, quadraId: string, lista: CasaSeed[]) {
  for (const c of lista) {
    const { id, ...resto } = c
    await gravar(`cards/${cartaoId}/blocks/${quadraId}/houses/${id}`, { ...resto, criadoEm: AGORA })
  }
}

async function visita(cartaoId: string, quadraId: string, casaId: string, status: string, ciclo: number, rodada: number) {
  await gravar(`cards/${cartaoId}/blocks/${quadraId}/houses/${casaId}/visits/v-${casaId}`, {
    status, em: AGORA, porUid: 'uid-semente', porNome: 'Bruno Semente', ciclo, rodada,
  })
}

async function rodada(cartaoId: string, quadraId: string, id: string, numero: number, encerrada: boolean) {
  await gravar(`cards/${cartaoId}/blocks/${quadraId}/rodadas/${id}`, {
    numero, abertaPorUid: 'uid-semente', abertaPorNome: 'Bruno Semente', abertaEm: AGORA,
    ...(encerrada && { encerradaPorUid: 'uid-semente', encerradaPorNome: 'Bruno Semente', encerradaEm: new Date(AGORA.getTime() + 3_600_000) }),
  })
}

async function evento(cartaoId: string, id: string, e: { tipo: string; motivo: string; minutos: number; quadraId?: string; quadraRotulo?: string; rodada?: number }) {
  const { minutos, ...resto } = e
  await gravar(`cards/${cartaoId}/eventos/${id}`, { ...resto, em: new Date(AGORA.getTime() + minutos * 60_000), porUid: 'uid-semente', porNome: 'Bruno Semente' })
}

/**
 * - membros: um admin e um publicador; `DESCONHECIDO` fica de fora.
 * - `c-aberto`: aberto, Quadra A com a rodada 1 aberta, duas ruas e 3 casas pendentes.
 * - `c-quase`: aberto, Quadra B sem rodada aberta e com a rodada 1 já encerrada; 2 casas, uma já conversada.
 * - `c-fechado`: fechado, ciclo 2, 4 casas: conversado, estudo, não visitar e não atendeu.
 * As quadras trazem `totalCasas`, `faltam` e `rodadasTotal` coerentes com as casas.
 */
export async function semear() {
  await gravar(`members/${ADMIN.email}`, { nome: ADMIN.nome, papel: 'admin', ativo: true })
  await gravar(`members/${PUBLICADOR.email}`, { nome: PUBLICADOR.nome, papel: 'publicador', ativo: true })

  await cartao(CARTAO_ABERTO, { numero: '1', titulo: 'Centro', estado: 'aberto', ciclo: 1, total: 3, resolvidas: 0 })
  await quadra(CARTAO_ABERTO, 'q1', 'Quadra A', ['Rua das Flores', 'Rua do Sol'], {
    total: 3, faltam: 3, rodadasTotal: 1, rodadaAtual: { id: 'r1', numero: 1, porNome: 'Bruno Semente', em: AGORA.getTime() },
  })
  await rodada(CARTAO_ABERTO, 'q1', 'r1', 1, false)
  await evento(CARTAO_ABERTO, 'e1', { tipo: 'fechado', motivo: 'criacao', minutos: -60 })
  await evento(CARTAO_ABERTO, 'e2', { tipo: 'rodada', motivo: 'rodada_aberta', minutos: 0, quadraId: 'q1', quadraRotulo: 'Quadra A', rodada: 1 })
  await casas(CARTAO_ABERTO, 'q1', [
    { id: 'h10', rua: 'Rua das Flores', numero: '10', ordem: 1, status: 'pendente' },
    { id: 'h20', rua: 'Rua das Flores', numero: '20', ordem: 2, status: 'pendente' },
    { id: 'h5', rua: 'Rua do Sol', numero: '5', ordem: 1, status: 'pendente' },
  ])

  await cartao(CARTAO_QUASE, { numero: '2', titulo: 'Jardim', estado: 'aberto', ciclo: 1, total: 2, resolvidas: 1 })
  await quadra(CARTAO_QUASE, 'q1', 'Quadra B', ['Rua das Acácias', 'Rua do Lago'], { total: 2, faltam: 1, rodadasTotal: 1 })
  await rodada(CARTAO_QUASE, 'q1', 'r1', 1, true)
  await evento(CARTAO_QUASE, 'e1', { tipo: 'fechado', motivo: 'criacao', minutos: -60 })
  await evento(CARTAO_QUASE, 'e2', { tipo: 'rodada', motivo: 'rodada_aberta', minutos: 0, quadraId: 'q1', quadraRotulo: 'Quadra B', rodada: 1 })
  await evento(CARTAO_QUASE, 'e3', { tipo: 'rodada', motivo: 'rodada_encerrada', minutos: 60, quadraId: 'q1', quadraRotulo: 'Quadra B', rodada: 1 })
  await casas(CARTAO_QUASE, 'q1', [
    { id: 'h1', rua: 'Rua das Acácias', numero: '1', ordem: 1, status: 'falado' },
    { id: 'h2', rua: 'Rua das Acácias', numero: '2', ordem: 2, status: 'pendente' },
  ])
  await visita(CARTAO_QUASE, 'q1', 'h1', 'falado', 1, 1)

  await cartao(CARTAO_FECHADO, { numero: '3', titulo: 'Vila', estado: 'fechado', ciclo: 2, total: 4, resolvidas: 3 })
  await quadra(CARTAO_FECHADO, 'q1', 'Quadra C', ['Rua das Pedras', 'Rua do Rio'], { total: 4, faltam: 1, rodadasTotal: 0 })
  await casas(CARTAO_FECHADO, 'q1', [
    { id: 'h1', rua: 'Rua das Pedras', numero: '1', ordem: 1, status: 'falado' },
    { id: 'h2', rua: 'Rua das Pedras', numero: '2', ordem: 2, status: 'estudo' },
    { id: 'h3', rua: 'Rua do Rio', numero: '3', ordem: 1, status: 'nao_visitar' },
    { id: 'h4', rua: 'Rua do Rio', numero: '4', ordem: 2, status: 'sem_resposta' },
  ])
}
