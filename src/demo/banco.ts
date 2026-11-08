import { abrirCartao, estadoAposFecharEReiniciar, fecharCartao, idsParaReiniciar, podeRegistrar } from '@/domain/ciclo'
import { validarCasa } from '@/domain/casa'
import { ordemEntre, ordemFim, ordenarCasas, precisaRenumerar } from '@/domain/ordem'
import { deltaResolvidas, isResolvida } from '@/domain/status'
import type { Cartao, Casa, EventoCartao, Papel, Quadra, Status, Visita } from '@/domain/types'
import { MAPA_DEMO_URL } from './mapa'

type Usuario = { uid: string; nome: string }
type Membro = { email: string; nome: string; papel: Papel; ativo: boolean }
type Estado = {
  cartoes: Cartao[]
  quadras: Record<string, Quadra[]>
  casas: Record<string, Casa[]>
  visitas: Record<string, Visita[]>
  eventos: Record<string, EventoCartao[]>
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
  const e: Estado = { cartoes: [], quadras: {}, casas: {}, visitas: {}, eventos: {}, membros: [], arquivos: { [MAPA_PATH]: MAPA_DEMO_URL } }

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
    return id
  }
  function casa(cartaoId: string, quadraId: string, rua: string, numero: string, status: Status, extra: { dias?: number; por?: string; obs?: string; descricao?: string } = {}) {
    const lista = e.casas[`${cartaoId}/${quadraId}`]
    const id = novoId()
    const ordem = ordemFim(lista.filter((c) => c.rua === rua).map((c) => c.ordem))
    const em = agora - (extra.dias ?? 1) * DIA
    const ciclo = (e.cartoes.find((c) => c.id === cartaoId) as Cartao).ciclo
    lista.push({
      id, quadraId, rua, numero, ordem, status, criadoEm: agora - 40 * DIA,
      ...(extra.descricao && { descricao: extra.descricao }),
      ...(status !== 'pendente' && { ultimaVisitaEm: em, ultimoPor: extra.por ?? 'Ana Souza' }),
    })
    if (status !== 'pendente') {
      e.visitas[`${cartaoId}/${quadraId}/${id}`] = [{ id: novoId(), status, em, porUid: 'u-demo', porNome: extra.por ?? 'Ana Souza', ciclo, ...(extra.obs && { obs: extra.obs }) }]
    }
  }
  function evento(cartaoId: string, tipo: EventoCartao['tipo'], motivo: EventoCartao['motivo'], dias: number, porNome: string) {
    e.eventos[cartaoId].push({ id: novoId(), tipo, motivo, em: agora - dias * DIA, porUid: 'u-demo', porNome })
  }

  const c12 = cartao({ numero: '12', titulo: 'Jardim das Flores', estado: 'aberto', ciclo: 2, imagemPath: MAPA_PATH, abertoPorNome: 'Ana Souza', abertoEm: agora - 6 * DIA })
  evento(c12, 'fechado', 'criacao', 90, 'Carlos Lima')
  evento(c12, 'fechado', 'fechamento_automatico', 20, 'Bruno Alves')
  evento(c12, 'aberto', 'abertura', 6, 'Ana Souza')
  const qa = quadra(c12, 'A', ['Rua das Palmeiras', 'Rua dos Ipês'])
  casa(c12, qa, 'Rua das Palmeiras', '100', 'falado', { dias: 5, obs: 'Aceitou uma publicação.' })
  casa(c12, qa, 'Rua das Palmeiras', '102', 'sem_resposta', { dias: 3, por: 'Bruno Alves' })
  casa(c12, qa, 'Rua das Palmeiras', '104', 'pendente')
  casa(c12, qa, 'Rua das Palmeiras', '106', 'estudo', { dias: 2, obs: 'Combinou continuar na próxima semana.' })
  casa(c12, qa, 'Rua das Palmeiras', '108', 'nao_visitar', { dias: 4, por: 'Carla Dias', descricao: 'portão verde' })
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

  // Falta uma casa: ao registrar a visita, o cartão fecha sozinho.
  const c13 = cartao({ numero: '13', titulo: 'Vila Nova', estado: 'aberto', ciclo: 1, abertoPorNome: 'Bruno Alves', abertoEm: agora - 3 * DIA })
  evento(c13, 'fechado', 'criacao', 30, 'Carlos Lima')
  evento(c13, 'aberto', 'abertura', 3, 'Bruno Alves')
  const q13 = quadra(c13, 'A', ['Rua Sete de Setembro'])
  casa(c13, q13, 'Rua Sete de Setembro', '10', 'falado', { dias: 2 })
  casa(c13, q13, 'Rua Sete de Setembro', '12', 'falado', { dias: 2 })
  casa(c13, q13, 'Rua Sete de Setembro', '14', 'falado', { dias: 1, por: 'Bruno Alves' })
  casa(c13, q13, 'Rua Sete de Setembro', '16', 'pendente', { descricao: 'casa de esquina' })

  const c14 = cartao({ numero: '14', titulo: 'Centro', estado: 'fechado', ciclo: 3 })
  evento(c14, 'fechado', 'criacao', 200, 'Carlos Lima')
  evento(c14, 'fechado', 'fechamento_automatico', 12, 'Carla Dias')
  const q14 = quadra(c14, 'A', ['Avenida Brasil'])
  casa(c14, q14, 'Avenida Brasil', '200', 'falado', { dias: 14 })
  casa(c14, q14, 'Avenida Brasil', '202', 'nao_visitar', { dias: 20 })
  casa(c14, q14, 'Avenida Brasil', '204', 'falado', { dias: 13, por: 'Carla Dias' })
  casa(c14, q14, 'Avenida Brasil', '206', 'estudo', { dias: 12, por: 'Carla Dias' })

  for (const c of e.cartoes) recontar(e, c.id)
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
  c.totalCasas = todas.length
  c.resolvidas = todas.filter((x) => isResolvida(x.status)).length
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
const registrarEvento = (cartaoId: string, tipo: EventoCartao['tipo'], motivo: EventoCartao['motivo'], u: Usuario) =>
  (estado.eventos[cartaoId] ??= []).push({ id: novoId(), tipo, motivo, em: Date.now(), porUid: u.uid, porNome: u.nome })
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

export async function atualizarCartao(id: string, d: Partial<Pick<Cartao, 'numero' | 'titulo' | 'mapsUrl' | 'imagemPath' | 'pdfPath'>>): Promise<void> {
  const c = cartaoPorId(id)
  Object.assign(c, d)
  tocar(c)
  mudou()
}

export async function fecharCartaoManual(c: Cartao, usuario: Usuario): Promise<void> {
  const atual = cartaoPorId(c.id)
  Object.assign(atual, fecharCartao(atual))
  tocar(atual)
  registrarEvento(c.id, 'fechado', 'fechamento_manual', usuario)
  mudou()
}

export async function abrirCartaoManual(c: Cartao, usuario: Usuario): Promise<void> {
  const atual = cartaoPorId(c.id)
  Object.assign(atual, abrirCartao(atual))
  tocar(atual)
  atual.abertoPorNome = usuario.nome
  atual.abertoEm = Date.now()
  registrarEvento(c.id, 'aberto', 'abertura', usuario)
  mudou()
}

export function observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void): () => void {
  return observar(() => [...(estado.eventos[cartaoId] ?? [])].sort((a, b) => b.em - a.em).slice(0, 10), cb)
}

// ---------- quadras ----------

export function observarQuadras(cartaoId: string, cb: (q: Quadra[]) => void): () => void {
  return observar(() => (estado.quadras[cartaoId] ?? []).map((q) => ({ ...q, ruas: [...q.ruas] })).sort((a, b) => a.ordem - b.ordem), cb)
}

export async function criarQuadra(cartaoId: string, d: { rotulo: string; ruas: string[] }): Promise<string> {
  const id = novoId()
  ;(estado.quadras[cartaoId] ??= []).push({ id, rotulo: d.rotulo, ruas: [...d.ruas], ordem: Date.now(), totalCasas: 0, faltam: 0, rodadasTotal: 0 })
  estado.casas[chaveCasas(cartaoId, id)] = []
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
  d: { rua: string; numero?: string; descricao?: string; depoisDe?: string },
  existentes: Casa[],
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
  lista.push({ id, quadraId, rua: d.rua, ...(numero && { numero }), ...(descricao && { descricao }), ordem, status: 'pendente', criadoEm: Date.now() })
  recontar(estado, cartaoId)
  tocar(cartaoPorId(cartaoId))
  mudou()
  return id
}

export async function criarCasasEmFaixa(cartaoId: string, quadraId: string, d: { rua: string; numeros: string[] }, existentes: Casa[]): Promise<void> {
  const numeros = d.numeros.map((n) => n.trim()).filter(Boolean)
  if (!numeros.length) return
  const inicio = ordemFim(existentes.filter((c) => c.rua === d.rua).map((c) => c.ordem))
  const lista = listaCasas(cartaoId, quadraId)
  numeros.forEach((numero, k) => lista.push({ id: novoId(), quadraId, rua: d.rua, numero, ordem: inicio + k, status: 'pendente', criadoEm: Date.now() }))
  recontar(estado, cartaoId)
  tocar(cartaoPorId(cartaoId))
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

export async function excluirCasa(cartaoId: string, quadraId: string, casa: Casa): Promise<void> {
  estado.casas[chaveCasas(cartaoId, quadraId)] = listaCasas(cartaoId, quadraId).filter((c) => c.id !== casa.id)
  recontar(estado, cartaoId)
  tocar(cartaoPorId(cartaoId))
  mudou()
}

export async function registrarVisita(a: { cartao: Cartao; quadraId: string; casa: Casa; novoStatus: Status; obs?: string; usuario: Usuario }): Promise<void> {
  const { quadraId, casa, novoStatus, usuario } = a
  const cartao = cartaoPorId(a.cartao.id)
  if (!podeRegistrar(cartao)) throw new Error('Cartão fechado')
  const alvo = listaCasas(cartao.id, quadraId).find((c) => c.id === casa.id)
  if (!alvo) throw new Error('Casa não encontrada')
  const agora = Date.now()
  const delta = deltaResolvidas(alvo.status, novoStatus)
  const obs = a.obs?.trim()
  const chave = `${cartao.id}/${quadraId}/${casa.id}`
  ;(estado.visitas[chave] ??= []).push({ id: novoId(), status: novoStatus, em: agora, porUid: usuario.uid, porNome: usuario.nome, ciclo: cartao.ciclo, ...(obs && { obs }) })
  Object.assign(alvo, { status: novoStatus, ultimaVisitaEm: agora, ultimoPor: usuario.nome })
  const fecha = false as boolean // provisório: Tarefa 5
  cartao.resolvidas += delta
  tocar(cartao)
  if (fecha) {
    Object.assign(cartao, fecharCartao(cartao))
    registrarEvento(cartao.id, 'fechado', 'fechamento_automatico', usuario)
  }
  mudou()
}

export async function reiniciarCartao(cartao: Cartao, casas: Casa[], usuario: Usuario): Promise<void> {
  const ids = new Set(idsParaReiniciar(casas))
  const atual = cartaoPorId(cartao.id)
  for (const c of casas) {
    if (!ids.has(c.id) || !c.quadraId) continue
    const real = listaCasas(cartao.id, c.quadraId).find((x) => x.id === c.id)
    if (real) real.status = 'pendente'
  }
  Object.assign(atual, estadoAposFecharEReiniciar(atual)) // provisório: Tarefa 5
  atual.resolvidas = casas.filter((c) => isResolvida(c.status) && !ids.has(c.id)).length
  tocar(atual)
  atual.abertoPorNome = usuario.nome
  atual.abertoEm = Date.now()
  registrarEvento(cartao.id, 'aberto', 'reinicio', usuario)
  mudou()
}

export async function recalcularContadores(cartaoId: string): Promise<void> {
  recontar(estado, cartaoId)
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
  const pdfPath = `cards/${cartaoId}/mapa.pdf`
  const imagemPath = `cards/${cartaoId}/mapa.webp`
  estado.arquivos[pdfPath] = URL.createObjectURL(arquivos.pdf)
  estado.arquivos[imagemPath] = URL.createObjectURL(arquivos.imagem)
  return { pdfPath, imagemPath }
}
