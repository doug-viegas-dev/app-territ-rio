import { abrirCartao, contadoresAposReinicio, estadoAposFecharEReiniciar, fecharCartao, idsParaReiniciar, podeRegistrar } from '@/domain/ciclo'
import { validarCasa } from '@/domain/casa'
import { vencimentoDoRegistro } from '@/domain/historico'
import { ordemEntre, ordemFim, ordenarCasas, precisaRenumerar } from '@/domain/ordem'
import { bloqueioDaQuadra, bloqueiosDoCartao, ExclusaoBloqueada } from '@/domain/exclusao'
import { renomearRuaNaLista } from '@/domain/ruas'
import { podeAbrirRodada, podeEncerrarRodada, podeFecharCartao, proximoNumeroRodada } from '@/domain/rodada'
import { contribuicao, deltaContadores } from '@/domain/status'
import type { Cartao, Casa, EventoCartao, Papel, Quadra, Rodada, Status, Visita } from '@/domain/types'
import { MAPA_DEMO_URL } from './mapa'

type Usuario = { uid: string; nome: string }
type OpcoesQuadra = { quadraSemContadores?: boolean }
type Membro = { email: string; nome: string; papel: Papel; ativo: boolean }
type Estado = {
  cartoes: Cartao[]
  quadras: Record<string, Quadra[]>
  casas: Record<string, Casa[]>
  visitas: Record<string, Visita[]>
  eventos: Record<string, EventoCartao[]>
  rodadas: Record<string, Rodada[]>
  membros: Membro[]
  arquivos: Record<string, string>
}

const DIA = 24 * 60 * 60 * 1000
const MAPA_PATH = 'demo/mapa-12.svg'
let contador = 0
const novoId = () => `demo-${++contador}`

// ---------- dados de exemplo (fictícios) ----------

function semear(): Estado {
  contador = 0
  const agora = Date.now()
  const e: Estado = { cartoes: [], quadras: {}, casas: {}, visitas: {}, eventos: {}, rodadas: {}, membros: [], arquivos: { [MAPA_PATH]: MAPA_DEMO_URL } }

  function cartao(d: Pick<Cartao, 'numero' | 'titulo' | 'estado' | 'ciclo'> & Partial<Cartao>): string {
    const id = novoId()
    e.cartoes.push({ id, totalCasas: 0, resolvidas: 0, atualizadoEm: agora, ...d })
    e.quadras[id] = []
    e.eventos[id] = []
    return id
  }
  function quadra(cartaoId: string, rotulo: string, ruas: string[]): string {
    const id = novoId()
    e.quadras[cartaoId].push({ id, rotulo, ruas, ordem: e.quadras[cartaoId].length + 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 })
    e.casas[`${cartaoId}/${id}`] = []
    e.rodadas[`${cartaoId}/${id}`] = []
    return id
  }
  function casa(cartaoId: string, quadraId: string, rua: string, numero: string, status: Status, extra: { dias?: number; por?: string; obs?: string; descricao?: string; rodada?: number; naoVisitar?: boolean; estudo?: boolean } = {}) {
    const lista = e.casas[`${cartaoId}/${quadraId}`]
    const id = novoId()
    const ordem = ordemFim(lista.filter((c) => c.rua === rua).map((c) => c.ordem))
    const em = agora - (extra.dias ?? 1) * DIA
    const por = extra.por ?? 'Ana Souza'
    const ciclo = (e.cartoes.find((c) => c.id === cartaoId) as Cartao).ciclo
    lista.push({
      id, quadraId, rua, numero, ordem, status, criadoEm: agora - 40 * DIA,
      ...(extra.descricao && { descricao: extra.descricao }),
      ...(status !== 'pendente' && { ultimaVisitaEm: em, ultimoPor: por }),
      ...(extra.naoVisitar && { naoVisitar: true, naoVisitarPor: por, naoVisitarEm: em }),
      ...(extra.estudo && { estudo: true, estudoPor: por, estudoEm: em }),
    })
    const visitas: Visita[] = []
    if (status !== 'pendente') {
      visitas.push({ id: novoId(), status, em, expiraEm: vencimentoDoRegistro(em), porUid: 'u-demo', porNome: por, ciclo, ...(extra.rodada !== undefined && { rodada: extra.rodada }) })
    }
    // observação: registro sem status, um pouco depois da visita
    if (extra.obs) visitas.push({ id: novoId(), obs: extra.obs, em: em + 60_000, expiraEm: vencimentoDoRegistro(em + 60_000), porUid: 'u-demo', porNome: por, ciclo })
    if (visitas.length) e.visitas[`${cartaoId}/${quadraId}/${id}`] = visitas
  }
  function evento(cartaoId: string, tipo: EventoCartao['tipo'], motivo: EventoCartao['motivo'], dias: number, porNome: string) {
    e.eventos[cartaoId].push({ id: novoId(), tipo, motivo, em: agora - dias * DIA, porUid: 'u-demo', porNome })
  }

  /** Rodada de exemplo da quadra: encerrada se `fimDias` vier; senão fica aberta e vira a `rodadaAtual`. */
  function rodada(cartaoId: string, quadraId: string, d: { inicioDias: number; fimDias?: number; por: string }) {
    const q = e.quadras[cartaoId].find((x) => x.id === quadraId) as Quadra
    const numero = q.rodadasTotal + 1
    const id = novoId()
    const abertaEm = agora - d.inicioDias * DIA
    const encerradaEm = d.fimDias === undefined ? undefined : agora - d.fimDias * DIA
    e.rodadas[`${cartaoId}/${quadraId}`].push({
      id, numero, abertaPorUid: 'u-demo', abertaPorNome: d.por, abertaEm,
      ...(encerradaEm !== undefined && { encerradaPorUid: 'u-demo', encerradaPorNome: d.por, encerradaEm }),
    })
    q.rodadasTotal = numero
    if (encerradaEm === undefined) q.rodadaAtual = { id, numero, porNome: d.por, em: abertaEm }
    const base = { quadraId, quadraRotulo: q.rotulo, rodada: numero, porUid: 'u-demo', porNome: d.por }
    e.eventos[cartaoId].push({ id: novoId(), tipo: 'rodada', motivo: 'rodada_aberta', em: abertaEm, ...base })
    if (encerradaEm !== undefined) e.eventos[cartaoId].push({ id: novoId(), tipo: 'rodada', motivo: 'rodada_encerrada', em: encerradaEm, ...base })
  }

  const c12 = cartao({ numero: '12', titulo: 'Jardim das Flores', estado: 'aberto', ciclo: 2, imagemPath: MAPA_PATH, abertoPorNome: 'Ana Souza', abertoEm: agora - 6 * DIA })
  evento(c12, 'fechado', 'criacao', 90, 'Carlos Lima')
  evento(c12, 'fechado', 'fechamento_automatico', 20, 'Bruno Alves')
  evento(c12, 'aberto', 'abertura', 6, 'Ana Souza')
  const qa = quadra(c12, 'A', ['Rua das Palmeiras', 'Rua dos Ipês'])
  casa(c12, qa, 'Rua das Palmeiras', '100', 'falado', { dias: 5, obs: 'Aceitou uma publicação.' })
  casa(c12, qa, 'Rua das Palmeiras', '102', 'sem_resposta', { dias: 3, por: 'Bruno Alves' })
  casa(c12, qa, 'Rua das Palmeiras', '104', 'pendente')
  casa(c12, qa, 'Rua das Palmeiras', '106', 'pendente', { dias: 2, estudo: true, obs: 'Combinou continuar na próxima semana.' })
  casa(c12, qa, 'Rua das Palmeiras', '108', 'pendente', { dias: 4, por: 'Carla Dias', descricao: 'portão verde', naoVisitar: true })
  casa(c12, qa, 'Rua das Palmeiras', '110', 'pendente')
  casa(c12, qa, 'Rua dos Ipês', '15', 'falado', { dias: 5, por: 'Bruno Alves' })
  casa(c12, qa, 'Rua dos Ipês', '17', 'pendente', { descricao: 'casa amarela' })
  casa(c12, qa, 'Rua dos Ipês', '19', 'sem_resposta', { dias: 1 })
  casa(c12, qa, 'Rua dos Ipês', '21', 'falado', { dias: 2, obs: 'Pediu para voltar à tarde.' })
  const qb = quadra(c12, 'B', ['Rua das Acácias'])
  casa(c12, qb, 'Rua das Acácias', '40', 'pendente')
  casa(c12, qb, 'Rua das Acácias', '42', 'falado', { dias: 3 })
  casa(c12, qb, 'Rua das Acácias', '44', 'pendente')
  casa(c12, qb, 'Rua das Acácias', '46', 'pendente')

  // Falta uma casa: registrar a visita não fecha o cartão; só um administrador fecha.
  const c13 = cartao({ numero: '13', titulo: 'Vila Nova', estado: 'aberto', ciclo: 1, abertoPorNome: 'Bruno Alves', abertoEm: agora - 3 * DIA })
  evento(c13, 'fechado', 'criacao', 30, 'Carlos Lima')
  evento(c13, 'aberto', 'abertura', 3, 'Bruno Alves')
  const q13 = quadra(c13, 'Quadra A', ['Rua Sete de Setembro'])
  rodada(c13, q13, { inicioDias: 2.5, fimDias: 1.5, por: 'Ana Souza' })
  rodada(c13, q13, { inicioDias: 1 / 24, por: 'Bruno Alves' })
  casa(c13, q13, 'Rua Sete de Setembro', '10', 'falado', { dias: 2, rodada: 1 })
  casa(c13, q13, 'Rua Sete de Setembro', '12', 'falado', { dias: 2, rodada: 1 })
  casa(c13, q13, 'Rua Sete de Setembro', '14', 'falado', { dias: 0.02, rodada: 2, por: 'Bruno Alves' })
  casa(c13, q13, 'Rua Sete de Setembro', '16', 'pendente', { descricao: 'casa de esquina' })

  const c14 = cartao({ numero: '14', titulo: 'Centro', estado: 'fechado', ciclo: 3 })
  evento(c14, 'fechado', 'criacao', 200, 'Carlos Lima')
  evento(c14, 'fechado', 'fechamento_automatico', 12, 'Carla Dias')
  const q14 = quadra(c14, 'A', ['Avenida Brasil'])
  casa(c14, q14, 'Avenida Brasil', '200', 'falado', { dias: 14 })
  casa(c14, q14, 'Avenida Brasil', '202', 'pendente', { dias: 20, naoVisitar: true })
  casa(c14, q14, 'Avenida Brasil', '204', 'falado', { dias: 13, por: 'Carla Dias' })
  casa(c14, q14, 'Avenida Brasil', '206', 'pendente', { dias: 12, por: 'Carla Dias', estudo: true })

  for (const c of e.cartoes) {
    recontar(e, c.id)
    for (const q of e.quadras[c.id]) recontarQuadra(e, c.id, q.id)
  }
  e.membros = [
    { email: 'visitante@demonstracao.app', nome: 'Visitante (demonstração)', papel: 'admin', ativo: true },
    { email: 'ana@exemplo.com', nome: 'Ana Souza', papel: 'publicador', ativo: true },
    { email: 'bruno@exemplo.com', nome: 'Bruno Alves', papel: 'publicador', ativo: true },
    { email: 'carla@exemplo.com', nome: 'Carla Dias', papel: 'publicador', ativo: false },
  ]
  return e
}

function recontar(e: Estado, cartaoId: string): void {
  const c = e.cartoes.find((x) => x.id === cartaoId)
  if (!c) return
  const todas = Object.entries(e.casas).filter(([k]) => k.startsWith(`${cartaoId}/`)).flatMap(([, v]) => v)
  const conta = somar(todas)
  c.totalCasas = conta.total
  c.resolvidas = conta.resolvidas
}

function recontarQuadra(e: Estado, cartaoId: string, quadraId: string): void {
  const q = e.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (!q) return
  const conta = somar(e.casas[`${cartaoId}/${quadraId}`] ?? [])
  q.totalCasas = conta.total
  q.faltam = conta.faltam
}

function somar(casas: Casa[]): { total: number; resolvidas: number; faltam: number } {
  const s = { total: 0, resolvidas: 0, faltam: 0 }
  for (const x of casas.map(contribuicao)) {
    s.total += x.total
    s.resolvidas += x.resolvidas
    s.faltam += x.faltam
  }
  return s
}

/** Soma o delta no cartão (totalCasas, resolvidas) e na quadra (totalCasas, faltam), se a quadra tiver contadores. */
function aplicarDelta(cartao: Cartao, quadra: Quadra, d: ReturnType<typeof deltaContadores>, op: OpcoesQuadra): void {
  cartao.totalCasas += d.total
  cartao.resolvidas += d.resolvidas
  if (op.quadraSemContadores) return
  quadra.totalCasas += d.total
  quadra.faltam += d.faltam
}

// ---------- armazenamento e observadores ----------

let estado: Estado = semear()
const ouvintes = new Set<() => void>()
const mudou = () => [...ouvintes].forEach((f) => f())

export function reiniciarBanco(): void {
  estado = semear()
  mudou()
}

function observar<T>(ler: () => T, cb: (v: T) => void): () => void {
  const emitir = () => cb(ler())
  ouvintes.add(emitir)
  emitir()
  return () => { ouvintes.delete(emitir) }
}

function cartaoPorId(id: string): Cartao {
  const c = estado.cartoes.find((x) => x.id === id)
  if (!c) throw new Error('Cartão não encontrado')
  return c
}
const chaveCasas = (cartaoId: string, quadraId: string) => `${cartaoId}/${quadraId}`
const listaCasas = (cartaoId: string, quadraId: string) => (estado.casas[chaveCasas(cartaoId, quadraId)] ??= [])
const tocar = (c: Cartao) => { c.atualizadoEm = Date.now() }
const registrarEvento = (cartaoId: string, tipo: EventoCartao['tipo'], motivo: EventoCartao['motivo'], u: Usuario, extra: Pick<EventoCartao, 'quadraId' | 'quadraRotulo' | 'rodada'> = {}) =>
  (estado.eventos[cartaoId] ??= []).push({ id: novoId(), tipo, motivo, em: Date.now(), porUid: u.uid, porNome: u.nome, ...extra })
const textoOuNada = (s?: string) => (s?.trim() ? s.trim() : undefined)

// ---------- cartões ----------

export function observarCartoes(cb: (c: Cartao[]) => void): () => void {
  return observar(() => {
    const porNumero = (a: Cartao, b: Cartao) => a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true })
    const todos = estado.cartoes.map((c) => ({ ...c }))
    return [...todos.filter((c) => c.estado === 'aberto').sort(porNumero), ...todos.filter((c) => c.estado !== 'aberto').sort(porNumero)]
  }, cb)
}

export function observarCartao(id: string, cb: (c: Cartao | null) => void): () => void {
  return observar(() => { const c = estado.cartoes.find((x) => x.id === id); return c ? { ...c } : null }, cb)
}

export async function criarCartao(d: { numero: string; titulo: string; mapsUrl?: string }, usuario: Usuario): Promise<string> {
  const id = novoId()
  estado.cartoes.push({ id, numero: d.numero, titulo: d.titulo, ...(d.mapsUrl && { mapsUrl: d.mapsUrl }), estado: 'fechado', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: Date.now() })
  estado.quadras[id] = []
  estado.eventos[id] = []
  registrarEvento(id, 'fechado', 'criacao', usuario)
  mudou()
  return id
}

export async function atualizarCartao(id: string, d: Partial<Pick<Cartao, 'numero' | 'titulo' | 'imagemPath' | 'pdfPath'>> & { mapsUrl?: string | null }): Promise<void> {
  const c = cartaoPorId(id)
  const { mapsUrl, ...resto } = d
  Object.assign(c, resto)
  if (mapsUrl === null) delete c.mapsUrl
  else if (mapsUrl !== undefined) c.mapsUrl = mapsUrl
  tocar(c)
  mudou()
}

export async function cartaoTemCasas(cartaoId: string): Promise<boolean> {
  return (estado.quadras[cartaoId] ?? []).some((q) => listaCasas(cartaoId, q.id).length > 0)
}

export async function excluirCartao(cartaoId: string): Promise<void> {
  const c = estado.cartoes.find((x) => x.id === cartaoId)
  if (!c) return
  const quadras = estado.quadras[cartaoId] ?? []
  const bloqueio = bloqueiosDoCartao(c, quadras)[0]
  if (bloqueio) throw new ExclusaoBloqueada(bloqueio)
  if (await cartaoTemCasas(cartaoId)) throw new ExclusaoBloqueada('casas')
  for (const q of quadras) {
    delete estado.casas[chaveCasas(cartaoId, q.id)]
    delete estado.rodadas[chaveCasas(cartaoId, q.id)]
  }
  delete estado.quadras[cartaoId]
  delete estado.eventos[cartaoId]
  estado.cartoes = estado.cartoes.filter((x) => x.id !== cartaoId)
  mudou()
}

export async function fecharCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra, 'rodadaAtual'>[]): Promise<void> {
  if (!podeFecharCartao(quadras)) throw new Error('Rodada aberta')
  const atual = cartaoPorId(c.id)
  Object.assign(atual, fecharCartao(atual))
  tocar(atual)
  registrarEvento(c.id, 'fechado', 'fechamento_manual', usuario)
  mudou()
}

export async function abrirCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra, 'id'>[]): Promise<void> {
  const atual = cartaoPorId(c.id)
  for (const { id } of quadras) {
    const q = estado.quadras[c.id]?.find((x) => x.id === id)
    if (q) { q.rodadasTotal = 0; delete q.rodadaAtual }
  }
  Object.assign(atual, abrirCartao(atual))
  tocar(atual)
  atual.abertoPorNome = usuario.nome
  atual.abertoEm = Date.now()
  registrarEvento(c.id, 'aberto', 'abertura', usuario)
  mudou()
}

export async function editarEvento(cartaoId: string, eventoId: string, d: { em: number; porNome: string }): Promise<void> {
  const e = (estado.eventos[cartaoId] ?? []).find((x) => x.id === eventoId)
  if (!e) throw new Error('Registro não encontrado')
  e.em = d.em
  e.porNome = d.porNome.trim()
  mudou()
}

export async function excluirEvento(cartaoId: string, eventoId: string): Promise<void> {
  estado.eventos[cartaoId] = (estado.eventos[cartaoId] ?? []).filter((x) => x.id !== eventoId)
  mudou()
}

export function observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void, limite = 50): () => void {
  return observar(() => [...(estado.eventos[cartaoId] ?? [])].sort((a, b) => b.em - a.em).slice(0, limite), cb)
}

// ---------- quadras ----------

export function observarQuadras(cartaoId: string, cb: (q: Quadra[]) => void): () => void {
  return observar(() => (estado.quadras[cartaoId] ?? []).map((q) => ({ ...q, ruas: [...q.ruas] })).sort((a, b) => a.ordem - b.ordem), cb)
}

export async function criarQuadra(cartaoId: string, d: { rotulo: string; ruas: string[] }): Promise<string> {
  const id = novoId()
  ;(estado.quadras[cartaoId] ??= []).push({ id, rotulo: d.rotulo, ruas: [...d.ruas], ordem: Date.now(), totalCasas: 0, faltam: 0, rodadasTotal: 0 })
  estado.casas[chaveCasas(cartaoId, id)] = []
  estado.rodadas[chaveCasas(cartaoId, id)] = []
  mudou()
  return id
}

export async function atualizarQuadra(cartaoId: string, id: string, d: Partial<Pick<Quadra, 'rotulo' | 'ruas' | 'ordem'>>): Promise<void> {
  const q = estado.quadras[cartaoId]?.find((x) => x.id === id)
  if (q) Object.assign(q, d)
  mudou()
}

export async function adicionarRua(cartaoId: string, quadraId: string, rua: string): Promise<void> {
  const nome = rua.trim()
  const q = estado.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (!nome || !q) return
  const chave = (s: string) => s.toLocaleLowerCase('pt-BR')
  if (q.ruas.some((r) => chave(r) === chave(nome))) return
  q.ruas.push(nome)
  mudou()
}

export async function quadraTemCasas(cartaoId: string, quadraId: string): Promise<boolean> {
  return listaCasas(cartaoId, quadraId).length > 0
}

export async function excluirQuadra(cartaoId: string, quadraId: string): Promise<void> {
  const q = estado.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (!q) return
  if (bloqueioDaQuadra(q)) throw new ExclusaoBloqueada('volta')
  if (await quadraTemCasas(cartaoId, quadraId)) throw new ExclusaoBloqueada('casas')
  estado.quadras[cartaoId] = estado.quadras[cartaoId].filter((x) => x.id !== quadraId)
  delete estado.casas[chaveCasas(cartaoId, quadraId)]
  delete estado.rodadas[chaveCasas(cartaoId, quadraId)]
  mudou()
}

export async function trocarOrdemDeQuadras(cartaoId: string, troca: [{ id: string; ordem: number }, { id: string; ordem: number }]): Promise<void> {
  for (const { id, ordem } of troca) {
    const q = estado.quadras[cartaoId]?.find((x) => x.id === id)
    if (q) q.ordem = ordem
  }
  mudou()
}

export async function renomearRua(cartaoId: string, quadraId: string, de: string, para: string): Promise<{ casas: number }> {
  const alvo = listaCasas(cartaoId, quadraId).filter((c) => c.rua === de)
  for (const c of alvo) c.rua = para
  const q = estado.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (q) q.ruas = renomearRuaNaLista(q.ruas, de, para)
  mudou()
  return { casas: alvo.length }
}

export async function removerRua(cartaoId: string, quadraId: string, rua: string): Promise<void> {
  if (listaCasas(cartaoId, quadraId).some((c) => c.rua === rua)) throw new ExclusaoBloqueada('casas')
  const q = estado.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (q) q.ruas = q.ruas.filter((r) => r !== rua)
  mudou()
}

// ---------- rodadas ----------

export function observarRodadas(cartaoId: string, quadraId: string, cb: (r: Rodada[]) => void): () => void {
  return observar(() => (estado.rodadas[chaveCasas(cartaoId, quadraId)] ?? []).map((r) => ({ ...r })).sort((a, b) => b.abertaEm - a.abertaEm || b.numero - a.numero), cb)
}

function quadraPorId(cartaoId: string, quadraId: string): Quadra {
  const q = estado.quadras[cartaoId]?.find((x) => x.id === quadraId)
  if (!q) throw new Error('Quadra não encontrada')
  return q
}

export async function abrirRodada(cartaoId: string, quadra: Quadra, usuario: Usuario): Promise<void> {
  const q = quadraPorId(cartaoId, quadra.id)
  if (!podeAbrirRodada(q)) throw new Error('A quadra já tem uma rodada aberta')
  const numero = proximoNumeroRodada(q)
  const id = novoId()
  const agora = Date.now()
  ;(estado.rodadas[chaveCasas(cartaoId, q.id)] ??= []).push({ id, numero, abertaPorUid: usuario.uid, abertaPorNome: usuario.nome, abertaEm: agora })
  q.rodadaAtual = { id, numero, porNome: usuario.nome, em: agora }
  q.rodadasTotal = numero
  registrarEvento(cartaoId, 'rodada', 'rodada_aberta', usuario, { quadraId: q.id, quadraRotulo: q.rotulo, rodada: numero })
  mudou()
}

export async function encerrarRodada(cartaoId: string, quadra: Quadra, usuario: Usuario): Promise<void> {
  const q = quadraPorId(cartaoId, quadra.id)
  const atual = q.rodadaAtual
  if (!podeEncerrarRodada(q) || !atual) throw new Error('A quadra não tem rodada aberta')
  const r = (estado.rodadas[chaveCasas(cartaoId, q.id)] ?? []).find((x) => x.id === atual.id)
  if (r) Object.assign(r, { encerradaPorUid: usuario.uid, encerradaPorNome: usuario.nome, encerradaEm: Date.now() })
  delete q.rodadaAtual
  registrarEvento(cartaoId, 'rodada', 'rodada_encerrada', usuario, { quadraId: q.id, quadraRotulo: q.rotulo, rodada: atual.numero })
  mudou()
}

// ---------- casas e visitas ----------

export function observarCasas(cartaoId: string, quadraId: string, cb: (c: Casa[], semDados?: boolean) => void): () => void {
  return observar(() => ordenarCasas(listaCasas(cartaoId, quadraId).map((c) => ({ ...c }))), (casas) => cb(casas, false))
}

export function observarVisitas(cartaoId: string, quadraId: string, casaId: string, cb: (v: Visita[]) => void): () => void {
  return observar(() => [...(estado.visitas[`${cartaoId}/${quadraId}/${casaId}`] ?? [])].sort((a, b) => b.em - a.em), cb)
}

function exigirValida(d: { numero?: string; descricao?: string }): void {
  const erro = validarCasa(d)
  if (erro) throw new Error(erro)
}

export async function criarCasa(
  cartaoId: string,
  quadraId: string,
  d: { rua: string; numero?: string; descricao?: string; depoisDe?: string; resultado?: { status: Status; usuario: Usuario; ciclo: number; rodada: number } },
  existentes: Casa[],
  op: OpcoesQuadra = {},
): Promise<string> {
  exigirValida(d)
  const lista = listaCasas(cartaoId, quadraId)
  const daRua = ordenarCasas(existentes.filter((c) => c.rua === d.rua))
  const i = d.depoisDe ? daRua.findIndex((c) => c.id === d.depoisDe) : -1
  let ordem = i >= 0 ? ordemEntre(daRua[i].ordem, daRua[i + 1]?.ordem ?? null) : ordemFim(daRua.map((c) => c.ordem))
  const vizinha = i >= 0 ? daRua[i + 1] : undefined
  if (i >= 0 && vizinha && precisaRenumerar(daRua[i].ordem, vizinha.ordem)) {
    daRua.forEach((c, k) => { const alvo = lista.find((x) => x.id === c.id); if (alvo) alvo.ordem = k <= i ? k + 1 : k + 2 })
    ordem = i + 2
  }
  const id = novoId()
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  const r = d.resultado && d.resultado.status !== 'pendente' ? d.resultado : undefined
  const status: Status = r ? r.status : 'pendente'
  const agora = Date.now()
  lista.push({ id, quadraId, rua: d.rua, ...(numero && { numero }), ...(descricao && { descricao }), ordem, status, criadoEm: agora, ...(r && { ultimaVisitaEm: agora, ultimoPor: r.usuario.nome }) })
  if (r) estado.visitas[`${cartaoId}/${quadraId}/${id}`] = [{ id: novoId(), status, em: agora, expiraEm: vencimentoDoRegistro(agora), porUid: r.usuario.uid, porNome: r.usuario.nome, ciclo: r.ciclo, rodada: r.rodada }]
  const cartao = cartaoPorId(cartaoId)
  aplicarDelta(cartao, quadraPorId(cartaoId, quadraId), deltaContadores(null, { status }), op)
  tocar(cartao)
  mudou()
  return id
}

export async function criarCasasEmFaixa(cartaoId: string, quadraId: string, d: { rua: string; numeros: string[] }, existentes: Casa[], op: OpcoesQuadra = {}): Promise<void> {
  const numeros = d.numeros.map((n) => n.trim()).filter(Boolean)
  if (!numeros.length) return
  const inicio = ordemFim(existentes.filter((c) => c.rua === d.rua).map((c) => c.ordem))
  const lista = listaCasas(cartaoId, quadraId)
  numeros.forEach((numero, k) => lista.push({ id: novoId(), quadraId, rua: d.rua, numero, ordem: inicio + k, status: 'pendente', criadoEm: Date.now() }))
  const cartao = cartaoPorId(cartaoId)
  const quadra = quadraPorId(cartaoId, quadraId)
  cartao.totalCasas += numeros.length
  if (!op.quadraSemContadores) {
    quadra.totalCasas += numeros.length
    quadra.faltam += numeros.length
  }
  tocar(cartao)
  mudou()
}

export async function moverCasa(
  cartaoId: string,
  quadraId: string,
  casaId: string,
  destino: { rua: string; antes: Casa | null; depois: Casa | null },
  ruaCasas: Casa[],
): Promise<void> {
  const lista = listaCasas(cartaoId, quadraId)
  const alvo = lista.find((c) => c.id === casaId)
  if (!alvo) return
  const { antes, depois } = destino
  if (antes && depois && precisaRenumerar(antes.ordem, depois.ordem)) {
    const demais = ordenarCasas(ruaCasas.filter((c) => c.id !== casaId && c.rua === destino.rua))
    const ids = demais.map((c) => c.id)
    ids.splice(demais.findIndex((c) => c.id === antes.id) + 1, 0, casaId)
    ids.forEach((id, k) => { const c = lista.find((x) => x.id === id); if (c) { c.ordem = k + 1; if (id === casaId) c.rua = destino.rua } })
  } else {
    alvo.rua = destino.rua
    alvo.ordem = ordemEntre(antes?.ordem ?? null, depois?.ordem ?? null)
  }
  mudou()
}

export async function editarCasa(cartaoId: string, quadraId: string, casaId: string, d: { numero?: string; descricao?: string }): Promise<void> {
  exigirValida(d)
  const c = listaCasas(cartaoId, quadraId).find((x) => x.id === casaId)
  if (!c) return
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  if (numero) c.numero = numero
  else delete c.numero
  if (descricao) c.descricao = descricao
  else delete c.descricao
  mudou()
}

export async function excluirCasa(cartaoId: string, quadraId: string, casa: Casa, op: OpcoesQuadra = {}): Promise<void> {
  estado.casas[chaveCasas(cartaoId, quadraId)] = listaCasas(cartaoId, quadraId).filter((c) => c.id !== casa.id)
  const cartao = cartaoPorId(cartaoId)
  aplicarDelta(cartao, quadraPorId(cartaoId, quadraId), deltaContadores(casa, null), op)
  tocar(cartao)
  mudou()
}

export async function registrarVisita(a: { cartao: Cartao; quadraId: string; rodada: number; casa: Casa; novoStatus: Status; usuario: Usuario } & OpcoesQuadra): Promise<void> {
  const { quadraId, casa, novoStatus, usuario } = a
  const cartao = cartaoPorId(a.cartao.id)
  if (!podeRegistrar(cartao)) throw new Error('Cartão fechado')
  const alvo = listaCasas(cartao.id, quadraId).find((c) => c.id === casa.id)
  if (!alvo) throw new Error('Casa não encontrada')
  if (alvo.naoVisitar) throw new Error('Casa marcada como não visitar')
  const agora = Date.now()
  const chave = `${cartao.id}/${quadraId}/${casa.id}`
  ;(estado.visitas[chave] ??= []).push({ id: novoId(), status: novoStatus, em: agora, expiraEm: vencimentoDoRegistro(agora), porUid: usuario.uid, porNome: usuario.nome, ciclo: cartao.ciclo, rodada: a.rodada })
  aplicarDelta(cartao, quadraPorId(cartao.id, quadraId), deltaContadores(alvo, { ...alvo, status: novoStatus }), a)
  Object.assign(alvo, { status: novoStatus, ultimaVisitaEm: agora, ultimoPor: usuario.nome })
  tocar(cartao)
  mudou()
}

export async function marcarCasa(a: { cartaoId: string; quadraId: string; casa: Casa; marca: 'naoVisitar' | 'estudo'; ligada: boolean; usuario: Usuario } & OpcoesQuadra): Promise<void> {
  const { cartaoId, quadraId, marca, ligada, usuario } = a
  const alvo = listaCasas(cartaoId, quadraId).find((c) => c.id === a.casa.id)
  if (!alvo) throw new Error('Casa não encontrada')
  if (!!alvo[marca] === ligada) return
  const antes = { ...alvo }
  if (ligada) Object.assign(alvo, { [marca]: true, [`${marca}Por`]: usuario.nome, [`${marca}Em`]: Date.now() })
  else for (const k of [marca, `${marca}Por`, `${marca}Em`]) delete (alvo as Record<string, unknown>)[k]
  const cartao = cartaoPorId(cartaoId)
  if (marca === 'naoVisitar') {
    aplicarDelta(cartao, quadraPorId(cartaoId, quadraId), deltaContadores(antes, alvo), a)
    tocar(cartao)
  }
  mudou()
}

export async function salvarObservacao(a: { cartaoId: string; quadraId: string; casaId: string; ciclo: number; texto: string; usuario: Usuario }): Promise<void> {
  const obs = a.texto.trim()
  if (!obs) throw new Error('Observação vazia')
  const agora = Date.now()
  ;(estado.visitas[`${a.cartaoId}/${a.quadraId}/${a.casaId}`] ??= []).push({ id: novoId(), obs, em: agora, expiraEm: vencimentoDoRegistro(agora), porUid: a.usuario.uid, porNome: a.usuario.nome, ciclo: a.ciclo })
  mudou()
}

export async function fecharEReiniciarCartao(cartao: Cartao, casas: Casa[], quadras: Quadra[], usuario: Usuario): Promise<void> {
  if (!podeFecharCartao(quadras)) throw new Error('Rodada aberta')
  const ids = new Set(idsParaReiniciar(casas))
  const atual = cartaoPorId(cartao.id)
  for (const c of casas) {
    if (!ids.has(c.id) || !c.quadraId) continue
    const real = listaCasas(cartao.id, c.quadraId).find((x) => x.id === c.id)
    if (real) real.status = 'pendente'
  }
  Object.assign(atual, estadoAposFecharEReiniciar(atual))
  atual.totalCasas = contadoresAposReinicio(casas).totalCasas
  atual.resolvidas = 0
  for (const q of quadras) Object.assign(quadraPorId(cartao.id, q.id), contadoresAposReinicio(casas.filter((c) => c.quadraId === q.id)))
  tocar(atual)
  registrarEvento(cartao.id, 'fechado', 'fechamento_reinicio', usuario)
  mudou()
}

export async function recalcularContadores(cartaoId: string): Promise<void> {
  recontar(estado, cartaoId)
  for (const q of estado.quadras[cartaoId] ?? []) recontarQuadra(estado, cartaoId, q.id)
  tocar(cartaoPorId(cartaoId))
  mudou()
}

// ---------- membros ----------

export function observarMembros(cb: (m: Membro[]) => void): () => void {
  return observar(() => estado.membros.map((m) => ({ ...m })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), cb)
}

export function observarMembroDemo(email: string, cb: (m: { papel: Papel; ativo: boolean; nome: string } | null) => void): () => void {
  return observar(() => {
    const m = estado.membros.find((x) => x.email === email.toLowerCase())
    return m ? { papel: m.papel, ativo: m.ativo, nome: m.nome } : null
  }, cb)
}

export async function salvarMembro(email: string, d: { nome: string; papel: Papel; ativo: boolean }): Promise<void> {
  const chave = email.trim().toLowerCase()
  const atual = estado.membros.find((m) => m.email === chave)
  if (atual) Object.assign(atual, { nome: d.nome.trim(), papel: d.papel, ativo: d.ativo })
  else estado.membros.push({ email: chave, nome: d.nome.trim(), papel: d.papel, ativo: d.ativo })
  mudou()
}

// ---------- arquivos ----------

export async function urlDoArquivo(path: string): Promise<string> {
  const url = estado.arquivos[path]
  if (!url) throw new Error('Arquivo não encontrado')
  return url
}

export async function guardarArquivos(cartaoId: string, arquivos: { pdf: Blob; imagem: Blob }): Promise<{ pdfPath: string; imagemPath: string }> {
  const quando = Date.now()
  const pdfPath = `cards/${cartaoId}/mapa-${quando}.pdf`
  const imagemPath = `cards/${cartaoId}/mapa-${quando}.webp`
  estado.arquivos[pdfPath] = URL.createObjectURL(arquivos.pdf)
  estado.arquivos[imagemPath] = URL.createObjectURL(arquivos.imagem)
  return { pdfPath, imagemPath }
}
