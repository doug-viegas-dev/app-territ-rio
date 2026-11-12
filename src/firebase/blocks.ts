import { arrayUnion, collection, doc, getDoc, getDocFromCache, getDocFromServer, getDocsFromServer, limit, orderBy, query, addDoc, updateDoc, where, writeBatch, type DocumentReference } from 'firebase/firestore'
import { bloqueioDaQuadra, ExclusaoBloqueada } from '@/domain/exclusao'
import { renomearRuaNaLista } from '@/domain/ruas'
import type { Quadra } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { ouvirComCache } from './cache'
import { quadraDe } from './converters'
import { LOTE } from './houses'

export function observarQuadras(cartaoId: string, cb: (q: Quadra[]) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarQuadras(cartaoId, cb)
  const q = query(collection(db, 'cards', cartaoId, 'blocks'), orderBy('ordem'))
  return ouvirComCache(`cards/${cartaoId}/blocks`, q, (snap) => cb(snap.docs.map((d) => quadraDe(d.id, d.data()))), onErro)
}

export async function criarQuadra(cartaoId: string, d: { rotulo: string; ruas: string[] }): Promise<string> {
  if (demoAtivo()) return demo.criarQuadra(cartaoId, d)
  const ref = await addDoc(collection(db, 'cards', cartaoId, 'blocks'), { rotulo: d.rotulo, ruas: d.ruas, ordem: Date.now(), totalCasas: 0, faltam: 0, rodadasTotal: 0 })
  return ref.id
}

export async function atualizarQuadra(cartaoId: string, id: string, d: Partial<Pick<Quadra, 'rotulo' | 'ruas' | 'ordem'>>): Promise<void> {
  if (demoAtivo()) return demo.atualizarQuadra(cartaoId, id, d)
  await updateDoc(doc(db, 'cards', cartaoId, 'blocks', id), d)
}

export async function adicionarRua(cartaoId: string, quadraId: string, rua: string): Promise<void> {
  if (demoAtivo()) return demo.adicionarRua(cartaoId, quadraId, rua)
  const nome = rua.trim()
  if (!nome) return
  const ref = doc(db, 'cards', cartaoId, 'blocks', quadraId)
  // Do cache; sem ele, espera o servidor no máximo 2 s (o arrayUnion abaixo já não repete a mesma grafia).
  const snap = await getDocFromCache(ref).catch(() => Promise.race([
    getDoc(ref),
    new Promise<null>((resolver) => setTimeout(() => resolver(null), 2_000)),
  ]))
  const ruas = snap?.data()?.ruas
  const chave = (s: string) => s.toLocaleLowerCase('pt-BR')
  if (Array.isArray(ruas) && ruas.some((r) => chave(String(r)) === chave(nome))) return
  await updateDoc(ref, { ruas: arrayUnion(nome) })
}

/** A renomeação gravou parte das casas e parou: repetir termina o trabalho. */
export class RenomeacaoIncompleta extends Error {
  readonly causa: unknown
  constructor(causa: unknown) {
    super('Renomeação incompleta')
    this.causa = causa
    this.name = 'RenomeacaoIncompleta'
  }
}

export async function quadraTemCasas(cartaoId: string, quadraId: string): Promise<boolean> {
  if (demoAtivo()) return demo.quadraTemCasas(cartaoId, quadraId)
  const snap = await getDocsFromServer(query(collection(db, 'cards', cartaoId, 'blocks', quadraId, 'houses'), limit(1)))
  return !snap.empty
}

export async function excluirQuadra(cartaoId: string, quadraId: string): Promise<void> {
  if (demoAtivo()) return demo.excluirQuadra(cartaoId, quadraId)
  const ref = doc(db, 'cards', cartaoId, 'blocks', quadraId)
  const snap = await getDocFromServer(ref)
  if (!snap.exists()) return
  if (bloqueioDaQuadra(quadraDe(snap.id, snap.data()))) throw new ExclusaoBloqueada('volta')
  if (await quadraTemCasas(cartaoId, quadraId)) throw new ExclusaoBloqueada('casas')
  const rodadas = await getDocsFromServer(collection(ref, 'rodadas'))
  const refs: DocumentReference[] = [...rodadas.docs.map((d) => d.ref), ref]
  for (let i = 0; i < refs.length; i += LOTE) {
    const batch = writeBatch(db)
    for (const r of refs.slice(i, i + LOTE)) batch.delete(r)
    await batch.commit() // a quadra é o último documento: só some depois das rodadas
  }
}

export async function trocarOrdemDeQuadras(cartaoId: string, troca: [{ id: string; ordem: number }, { id: string; ordem: number }]): Promise<void> {
  if (demoAtivo()) return demo.trocarOrdemDeQuadras(cartaoId, troca)
  const batch = writeBatch(db)
  for (const { id, ordem } of troca) batch.update(doc(db, 'cards', cartaoId, 'blocks', id), { ordem })
  await batch.commit()
}

export async function renomearRua(cartaoId: string, quadraId: string, de: string, para: string): Promise<{ casas: number }> {
  if (demoAtivo()) return demo.renomearRua(cartaoId, quadraId, de, para)
  const ref = doc(db, 'cards', cartaoId, 'blocks', quadraId)
  const casas = await getDocsFromServer(query(collection(ref, 'houses'), where('rua', '==', de)))
  let gravados = 0
  try {
    for (let i = 0; i < casas.docs.length; i += LOTE) {
      const batch = writeBatch(db)
      for (const c of casas.docs.slice(i, i + LOTE)) batch.update(c.ref, { rua: para })
      await batch.commit()
      gravados += 1
    }
    const quadra = await getDocFromServer(ref)
    if (!quadra.exists()) throw new Error('Quadra não encontrada')
    await updateDoc(ref, { ruas: renomearRuaNaLista(quadraDe(quadra.id, quadra.data()).ruas, de, para) })
  } catch (e) {
    throw gravados > 0 ? new RenomeacaoIncompleta(e) : e
  }
  return { casas: casas.size }
}

export async function removerRua(cartaoId: string, quadraId: string, rua: string): Promise<void> {
  if (demoAtivo()) return demo.removerRua(cartaoId, quadraId, rua)
  const ref = doc(db, 'cards', cartaoId, 'blocks', quadraId)
  const casas = await getDocsFromServer(query(collection(ref, 'houses'), where('rua', '==', rua), limit(1)))
  if (!casas.empty) throw new ExclusaoBloqueada('casas')
  const quadra = await getDocFromServer(ref)
  if (!quadra.exists()) throw new Error('Quadra não encontrada')
  await updateDoc(ref, { ruas: quadraDe(quadra.id, quadra.data()).ruas.filter((r) => r !== rua) })
}
