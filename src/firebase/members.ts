import { doc, onSnapshot } from 'firebase/firestore'
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
