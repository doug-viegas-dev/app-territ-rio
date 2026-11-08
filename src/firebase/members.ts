import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { Papel } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'

export type MembroObservado = { papel: Papel; ativo: boolean; nome: string }

export function observarMembro(email: string, cb: (membro: MembroObservado | null) => void): () => void {
  if (demoAtivo()) return demo.observarMembroDemo(email, cb)
  return onSnapshot(doc(db, 'members', email.toLowerCase()), (snapshot) => {
    // Cache vazio não prova que o e-mail não foi liberado (a conexão pode ter falhado): espera o servidor.
    if (!snapshot.exists() && snapshot.metadata.fromCache) return
    const data = snapshot.data()
    cb(snapshot.exists() && (data?.papel === 'admin' || data?.papel === 'publicador')
      ? { papel: data.papel, ativo: data.ativo === true, nome: typeof data.nome === 'string' ? data.nome : email }
      : null)
  }, () => cb(null))
}

export function observarMembros(cb: (m: (MembroObservado & { email: string })[]) => void): () => void {
  if (demoAtivo()) return demo.observarMembros(cb)
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
  if (demoAtivo()) return demo.salvarMembro(email, d)
  await setDoc(doc(db, 'members', email.trim().toLowerCase()), { nome: d.nome.trim(), papel: d.papel, ativo: d.ativo })
}
