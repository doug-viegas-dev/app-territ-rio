import { collection, deleteDoc, deleteField, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, updateDoc, writeBatch, type DocumentReference } from 'firebase/firestore'
import { abrirCartao, fecharCartao } from '@/domain/ciclo'
import { podeFecharCartao } from '@/domain/rodada'
import { bloqueiosDoCartao, ExclusaoBloqueada } from '@/domain/exclusao'
import type { Cartao, EventoCartao, Quadra } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { ouvirComCache, ouvirDocComCache } from './cache'
import { cartaoDe, eventoDe, paraTimestamp, quadraDe } from './converters'

const LOTE = 400 // limite de 500 escritas por lote, com folga

type Usuario = { uid: string; nome: string }

export function observarCartoes(cb: (c: Cartao[]) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarCartoes(cb)
  return ouvirComCache('cards', collection(db, 'cards'), (snap) => {
    const todos = snap.docs.map((d) => cartaoDe(d.id, d.data()))
    const porNumero = (a: Cartao, b: Cartao) => a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true })
    cb([
      ...todos.filter((c) => c.estado === 'aberto').sort(porNumero),
      ...todos.filter((c) => c.estado !== 'aberto').sort(porNumero),
    ])
  }, onErro)
}

export function observarCartao(id: string, cb: (c: Cartao | null) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarCartao(id, cb)
  return ouvirDocComCache(`cards/${id}`, doc(db, 'cards', id), (snap) => cb(snap.exists() ? cartaoDe(snap.id, snap.data()) : null), onErro)
}

export async function criarCartao(d: { numero: string; titulo: string; mapsUrl?: string }, usuario: Usuario): Promise<string> {
  if (demoAtivo()) return demo.criarCartao(d, usuario)
  const ref = doc(collection(db, 'cards'))
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.set(ref, {
    numero: d.numero,
    titulo: d.titulo,
    ...(d.mapsUrl && { mapsUrl: d.mapsUrl }),
    estado: 'fechado',
    ciclo: 1,
    totalCasas: 0,
    resolvidas: 0,
    atualizadoEm: agora,
  })
  batch.set(doc(collection(ref, 'eventos')), { tipo: 'fechado', motivo: 'criacao', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  await batch.commit()
  return ref.id
}

export async function atualizarCartao(
  id: string,
  d: Partial<Pick<Cartao, 'numero' | 'titulo' | 'imagemPath' | 'pdfPath'>> & { mapsUrl?: string | null },
): Promise<void> {
  if (demoAtivo()) return demo.atualizarCartao(id, d)
  const { mapsUrl, ...resto } = d
  await updateDoc(doc(db, 'cards', id), {
    ...resto,
    ...(mapsUrl === null ? { mapsUrl: deleteField() } : mapsUrl !== undefined ? { mapsUrl } : {}),
    atualizadoEm: paraTimestamp(Date.now()),
  })
}

/** Lê do servidor: há ao menos uma casa (mesmo marcada "não visitar") em alguma quadra do cartão? */
export async function cartaoTemCasas(cartaoId: string): Promise<boolean> {
  if (demoAtivo()) return demo.cartaoTemCasas(cartaoId)
  const quadras = await getDocsFromServer(collection(db, 'cards', cartaoId, 'blocks'))
  for (const q of quadras.docs) {
    const casas = await getDocsFromServer(query(collection(q.ref, 'houses'), limit(1)))
    if (!casas.empty) return true
  }
  return false
}

/** Exclui um cartão fechado, vazio e sem volta aberta, com suas quadras, rodadas e eventos. Não mexe no Storage. */
export async function excluirCartao(cartaoId: string): Promise<void> {
  if (demoAtivo()) return demo.excluirCartao(cartaoId)
  const cartaoRef = doc(db, 'cards', cartaoId)
  const snap = await getDocFromServer(cartaoRef)
  if (!snap.exists()) return
  const quadrasSnap = await getDocsFromServer(collection(cartaoRef, 'blocks'))
  const quadras = quadrasSnap.docs.map((d) => quadraDe(d.id, d.data()))
  const bloqueio = bloqueiosDoCartao(cartaoDe(snap.id, snap.data()), quadras)[0]
  if (bloqueio) throw new ExclusaoBloqueada(bloqueio)
  for (const q of quadrasSnap.docs) {
    const casas = await getDocsFromServer(query(collection(q.ref, 'houses'), limit(1)))
    if (!casas.empty) throw new ExclusaoBloqueada('casas')
  }
  const refs: DocumentReference[] = []
  for (const q of quadrasSnap.docs) {
    const rodadas = await getDocsFromServer(collection(q.ref, 'rodadas'))
    refs.push(...rodadas.docs.map((d) => d.ref), q.ref)
  }
  const eventos = await getDocsFromServer(collection(cartaoRef, 'eventos'))
  refs.push(...eventos.docs.map((d) => d.ref), cartaoRef)
  for (let i = 0; i < refs.length; i += LOTE) {
    const batch = writeBatch(db)
    for (const r of refs.slice(i, i + LOTE)) batch.delete(r)
    await batch.commit() // o cartão é o último documento: só some depois do resto
  }
}

export async function fecharCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra, 'rodadaAtual'>[]): Promise<void> {
  if (!podeFecharCartao(quadras)) throw new Error('Rodada aberta')
  if (demoAtivo()) return demo.fecharCartaoManual(c, usuario, quadras)
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.update(doc(db, 'cards', c.id), { ...fecharCartao(c), atualizadoEm: agora })
  batch.set(doc(collection(db, 'cards', c.id, 'eventos')), { tipo: 'fechado', motivo: 'fechamento_manual', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  await batch.commit()
}

/** Abrir recomeça a contagem: cada quadra volta a zero voltas e perde a rodada aberta, no mesmo lote. */
export async function abrirCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra, 'id'>[]): Promise<void> {
  if (demoAtivo()) return demo.abrirCartaoManual(c, usuario, quadras)
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  for (const q of quadras) batch.update(doc(db, 'cards', c.id, 'blocks', q.id), { rodadasTotal: 0, rodadaAtual: deleteField() })
  batch.update(doc(db, 'cards', c.id), { ...abrirCartao(c), atualizadoEm: agora, abertoPorNome: usuario.nome, abertoEm: agora })
  batch.set(doc(collection(db, 'cards', c.id, 'eventos')), { tipo: 'aberto', motivo: 'abertura', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  await batch.commit()
}

/** Só o administrador (regras do servidor): corrige quando e por quem o registro foi feito. */
export async function editarEvento(cartaoId: string, eventoId: string, d: { em: number; porNome: string }): Promise<void> {
  if (demoAtivo()) return demo.editarEvento(cartaoId, eventoId, d)
  await updateDoc(doc(db, 'cards', cartaoId, 'eventos', eventoId), { em: paraTimestamp(d.em), porNome: d.porNome.trim() })
}

export async function excluirEvento(cartaoId: string, eventoId: string): Promise<void> {
  if (demoAtivo()) return demo.excluirEvento(cartaoId, eventoId)
  await deleteDoc(doc(db, 'cards', cartaoId, 'eventos', eventoId))
}

export function observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void, limite = 50): () => void {
  if (demoAtivo()) return demo.observarEventos(cartaoId, cb, limite)
  const q = query(collection(db, 'cards', cartaoId, 'eventos'), orderBy('em', 'desc'), limit(limite))
  return ouvirComCache(`cards/${cartaoId}/eventos`, q, (snap) => cb(snap.docs.map((d) => eventoDe(d.id, d.data()))))
}
