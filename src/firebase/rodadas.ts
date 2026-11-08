import { collection, deleteField, doc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore'
import { podeAbrirRodada, podeEncerrarRodada, proximoNumeroRodada } from '@/domain/rodada'
import type { Quadra, Rodada } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { paraTimestamp, rodadaDe } from './converters'

type Usuario = { uid: string; nome: string }

export function observarRodadas(cartaoId: string, quadraId: string, cb: (r: Rodada[]) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarRodadas(cartaoId, quadraId, cb)
  const q = query(collection(db, 'cards', cartaoId, 'blocks', quadraId, 'rodadas'), orderBy('numero', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => rodadaDe(d.id, d.data()))), onErro)
}

export async function abrirRodada(cartaoId: string, quadra: Quadra, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.abrirRodada(cartaoId, quadra, usuario)
  if (!podeAbrirRodada(quadra)) throw new Error('A quadra já tem uma rodada aberta')
  const numero = proximoNumeroRodada(quadra)
  const agora = paraTimestamp(Date.now())
  const quadraRef = doc(db, 'cards', cartaoId, 'blocks', quadra.id)
  const rodadaRef = doc(collection(quadraRef, 'rodadas'))
  const batch = writeBatch(db)
  batch.set(rodadaRef, { numero, abertaPorUid: usuario.uid, abertaPorNome: usuario.nome, abertaEm: agora })
  batch.update(quadraRef, { rodadaAtual: { id: rodadaRef.id, numero, porNome: usuario.nome, em: agora.toMillis() }, rodadasTotal: numero })
  batch.set(doc(collection(db, 'cards', cartaoId, 'eventos')), {
    tipo: 'rodada', motivo: 'rodada_aberta', quadraId: quadra.id, quadraRotulo: quadra.rotulo, rodada: numero,
    em: agora, porUid: usuario.uid, porNome: usuario.nome,
  })
  await batch.commit()
}

export async function encerrarRodada(cartaoId: string, quadra: Quadra, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.encerrarRodada(cartaoId, quadra, usuario)
  const atual = quadra.rodadaAtual
  if (!podeEncerrarRodada(quadra) || !atual) throw new Error('A quadra não tem rodada aberta')
  const agora = paraTimestamp(Date.now())
  const quadraRef = doc(db, 'cards', cartaoId, 'blocks', quadra.id)
  const batch = writeBatch(db)
  batch.update(doc(quadraRef, 'rodadas', atual.id), { encerradaPorUid: usuario.uid, encerradaPorNome: usuario.nome, encerradaEm: agora })
  batch.update(quadraRef, { rodadaAtual: deleteField() })
  batch.set(doc(collection(db, 'cards', cartaoId, 'eventos')), {
    tipo: 'rodada', motivo: 'rodada_encerrada', quadraId: quadra.id, quadraRotulo: quadra.rotulo, rodada: atual.numero,
    em: agora, porUid: usuario.uid, porNome: usuario.nome,
  })
  await batch.commit()
}
