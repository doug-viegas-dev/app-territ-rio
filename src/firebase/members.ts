import { clearIndexedDbPersistence, collection, deleteDoc, doc, onSnapshot, setDoc, terminate } from 'firebase/firestore'
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
  }, (erro) => {
    // O servidor nega a leitura a quem não está liberado; qualquer outro erro é falha de conexão, não "não liberado".
    if (erro.code === 'permission-denied') cb(null)
  })
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

export async function removerMembro(email: string): Promise<void> {
  if (demoAtivo()) return demo.removerMembro(email)
  await deleteDoc(doc(db, 'members', email.trim().toLowerCase()))
}

/** Botão "Verificar de novo": descarta o cache local do Firestore (que pode guardar um "não existe" antigo) e recarrega. */
export async function verificarDeNovo(): Promise<void> {
  if (!demoAtivo()) {
    try {
      await terminate(db)
      await clearIndexedDbPersistence(db)
    } catch { /* sem cache para limpar: só recarrega */ }
  }
  window.location.reload()
}
