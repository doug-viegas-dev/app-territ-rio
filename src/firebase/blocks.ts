import { arrayUnion, collection, doc, getDoc, onSnapshot, orderBy, query, addDoc, updateDoc } from 'firebase/firestore'
import type { Quadra } from '@/domain/types'
import { db } from './app'
import { quadraDe } from './converters'

export function observarQuadras(cartaoId: string, cb: (q: Quadra[]) => void): () => void {
  const q = query(collection(db, 'cards', cartaoId, 'blocks'), orderBy('ordem'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => quadraDe(d.id, d.data()))))
}

export async function criarQuadra(cartaoId: string, d: { rotulo: string; ruas: string[] }): Promise<string> {
  const ref = await addDoc(collection(db, 'cards', cartaoId, 'blocks'), { rotulo: d.rotulo, ruas: d.ruas, ordem: Date.now() })
  return ref.id
}

export async function atualizarQuadra(cartaoId: string, id: string, d: Partial<Pick<Quadra, 'rotulo' | 'ruas' | 'ordem'>>): Promise<void> {
  await updateDoc(doc(db, 'cards', cartaoId, 'blocks', id), d)
}

export async function adicionarRua(cartaoId: string, quadraId: string, rua: string): Promise<void> {
  const nome = rua.trim()
  if (!nome) return
  const ref = doc(db, 'cards', cartaoId, 'blocks', quadraId)
  const ruas = (await getDoc(ref)).data()?.ruas
  const chave = (s: string) => s.toLocaleLowerCase('pt-BR')
  if (Array.isArray(ruas) && ruas.some((r) => chave(String(r)) === chave(nome))) return
  await updateDoc(ref, { ruas: arrayUnion(nome) })
}
