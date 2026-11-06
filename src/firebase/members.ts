import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { Papel } from '@/domain/types'
import { db } from './app'

export type MembroObservado = { papel: Papel; ativo: boolean; nome: string }

export function observarMembro(email: string, cb: (membro: MembroObservado | null) => void): () => void {
  return onSnapshot(doc(db, 'members', email.toLowerCase()), (snapshot) => {
    const data = snapshot.data()
    cb(snapshot.exists() && (data?.papel === 'admin' || data?.papel === 'publicador')
      ? { papel: data.papel, ativo: data.ativo === true, nome: typeof data.nome === 'string' ? data.nome : email }
      : null)
  }, () => cb(null))
}

export function observarMembros(cb: (m: (MembroObservado & { email: string })[]) => void): () => void {
  return onSnapshot(collection(db, 'members'), (snap) => {
    const lista = snap.docs.flatMap((d) => {
      const data = d.data()
      if (data.papel !== 'admin' && data.papel !== 'publicador') return []
      return [{ email: d.id, papel: data.papel as Papel, ativo: data.ativo === true, nome: typeof data.nome === 'string' ? data.nome : d.id }]
    })
    cb(lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
  })
}

export async function salvarMembro(email: string, d: { nome: string; papel: Papel; ativo: boolean }): Promise<void> {
  await setDoc(doc(db, 'members', email.trim().toLowerCase()), { nome: d.nome.trim(), papel: d.papel, ativo: d.ativo })
}
