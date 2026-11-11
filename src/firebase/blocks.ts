import { arrayUnion, collection, doc, getDoc, orderBy, query, addDoc, updateDoc } from 'firebase/firestore'
import type { Quadra } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { ouvirComCache } from './cache'
import { quadraDe } from './converters'

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
  const ruas = (await getDoc(ref)).data()?.ruas
  const chave = (s: string) => s.toLocaleLowerCase('pt-BR')
  if (Array.isArray(ruas) && ruas.some((r) => chave(String(r)) === chave(nome))) return
  await updateDoc(ref, { ruas: arrayUnion(nome) })
}
