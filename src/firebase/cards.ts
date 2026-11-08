import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore'
import { abrirCartao, fecharCartao } from '@/domain/ciclo'
import type { Cartao, EventoCartao } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { cartaoDe, eventoDe, paraTimestamp } from './converters'

type Usuario = { uid: string; nome: string }

export function observarCartoes(cb: (c: Cartao[]) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarCartoes(cb)
  return onSnapshot(collection(db, 'cards'), (snap) => {
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
  return onSnapshot(doc(db, 'cards', id), (snap) => cb(snap.exists() ? cartaoDe(snap.id, snap.data()) : null), onErro)
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

export async function atualizarCartao(id: string, d: Partial<Pick<Cartao, 'numero' | 'titulo' | 'mapsUrl' | 'imagemPath' | 'pdfPath'>>): Promise<void> {
  if (demoAtivo()) return demo.atualizarCartao(id, d)
  await updateDoc(doc(db, 'cards', id), { ...d, atualizadoEm: paraTimestamp(Date.now()) })
}

export async function fecharCartaoManual(c: Cartao, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.fecharCartaoManual(c, usuario)
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.update(doc(db, 'cards', c.id), { ...fecharCartao(c), atualizadoEm: agora })
  batch.set(doc(collection(db, 'cards', c.id, 'eventos')), { tipo: 'fechado', motivo: 'fechamento_manual', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  await batch.commit()
}

export async function abrirCartaoManual(c: Cartao, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.abrirCartaoManual(c, usuario)
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.update(doc(db, 'cards', c.id), { ...abrirCartao(c), atualizadoEm: agora, abertoPorNome: usuario.nome, abertoEm: agora })
  batch.set(doc(collection(db, 'cards', c.id, 'eventos')), { tipo: 'aberto', motivo: 'abertura', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  await batch.commit()
}

export function observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void, limite = 50): () => void {
  if (demoAtivo()) return demo.observarEventos(cartaoId, cb, limite)
  const q = query(collection(db, 'cards', cartaoId, 'eventos'), orderBy('em', 'desc'), limit(limite))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => eventoDe(d.id, d.data()))))
}
