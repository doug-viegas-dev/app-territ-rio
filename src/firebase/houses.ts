import { collection, deleteField, doc, getDocs, increment, onSnapshot, orderBy, query, updateDoc, writeBatch, type WriteBatch } from 'firebase/firestore'
import { abrirCartao, deveFecharAuto, fecharCartao, idsParaReiniciar, podeRegistrar } from '@/domain/ciclo'
import { validarCasa } from '@/domain/casa'
import { ordemEntre, ordemFim, ordenarCasas, precisaRenumerar } from '@/domain/ordem'
import { deltaResolvidas, isResolvida } from '@/domain/status'
import type { Cartao, Casa, Status, Visita } from '@/domain/types'
import { db } from './app'
import { casaDe, paraTimestamp, visitaDe } from './converters'

type Usuario = { uid: string; nome: string }

const casasRef = (cartaoId: string, quadraId: string) => collection(db, 'cards', cartaoId, 'blocks', quadraId, 'houses')
const cartaoRef = (cartaoId: string) => doc(db, 'cards', cartaoId)

export function observarCasas(cartaoId: string, quadraId: string, cb: (c: Casa[]) => void): () => void {
  return onSnapshot(casasRef(cartaoId, quadraId), (snap) => cb(ordenarCasas(snap.docs.map((d) => casaDe(d.id, quadraId, d.data())))))
}

export function observarVisitas(cartaoId: string, quadraId: string, casaId: string, cb: (v: Visita[]) => void): () => void {
  const q = query(collection(db, 'cards', cartaoId, 'blocks', quadraId, 'houses', casaId, 'visits'), orderBy('em', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => visitaDe(d.id, d.data()))))
}

function exigirValida(d: { numero?: string; descricao?: string }): void {
  const erro = validarCasa(d)
  if (erro) throw new Error(erro)
}

const textoOuNada = (s?: string) => (s?.trim() ? { valor: s.trim() } : null)

export async function criarCasa(
  cartaoId: string,
  quadraId: string,
  d: { rua: string; numero?: string; descricao?: string; depoisDe?: string },
  existentes: Casa[],
): Promise<string> {
  exigirValida(d)
  const daRua = ordenarCasas(existentes.filter((c) => c.rua === d.rua))
  let ordem: number
  const i = d.depoisDe ? daRua.findIndex((c) => c.id === d.depoisDe) : -1
  if (i >= 0) ordem = ordemEntre(daRua[i].ordem, daRua[i + 1]?.ordem ?? null)
  else ordem = ordemFim(daRua.map((c) => c.ordem))
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  const agora = paraTimestamp(Date.now())
  const ref = doc(casasRef(cartaoId, quadraId))
  const batch = writeBatch(db)
  batch.set(ref, {
    rua: d.rua,
    ...(numero && { numero: numero.valor }),
    ...(descricao && { descricao: descricao.valor }),
    ordem,
    status: 'pendente',
    criadoEm: agora,
  })
  batch.update(cartaoRef(cartaoId), { totalCasas: increment(1), atualizadoEm: agora })
  await batch.commit()
  return ref.id
}

export async function criarCasasEmFaixa(cartaoId: string, quadraId: string, d: { rua: string; numeros: string[] }, existentes: Casa[]): Promise<void> {
  const numeros = d.numeros.map((n) => n.trim()).filter(Boolean)
  if (!numeros.length) return
  const inicio = ordemFim(existentes.filter((c) => c.rua === d.rua).map((c) => c.ordem))
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  numeros.forEach((numero, i) => {
    batch.set(doc(casasRef(cartaoId, quadraId)), { rua: d.rua, numero, ordem: inicio + i, status: 'pendente', criadoEm: agora })
  })
  batch.update(cartaoRef(cartaoId), { totalCasas: increment(numeros.length), atualizadoEm: agora })
  await batch.commit()
}

export async function moverCasa(
  cartaoId: string,
  quadraId: string,
  casaId: string,
  destino: { rua: string; antes: Casa | null; depois: Casa | null },
  ruaCasas: Casa[],
): Promise<void> {
  const ref = (id: string) => doc(casasRef(cartaoId, quadraId), id)
  const { antes, depois } = destino
  if (antes && depois && precisaRenumerar(antes.ordem, depois.ordem)) {
    const demais = ordenarCasas(ruaCasas.filter((c) => c.id !== casaId && c.rua === destino.rua))
    const posicao = demais.findIndex((c) => c.id === antes.id) + 1
    const ids = demais.map((c) => c.id)
    ids.splice(posicao, 0, casaId)
    const batch = writeBatch(db)
    ids.forEach((id, i) => batch.update(ref(id), id === casaId ? { ordem: i + 1, rua: destino.rua } : { ordem: i + 1 }))
    await batch.commit()
    return
  }
  await updateDoc(ref(casaId), { rua: destino.rua, ordem: ordemEntre(antes?.ordem ?? null, depois?.ordem ?? null) })
}

export async function editarCasa(cartaoId: string, quadraId: string, casaId: string, d: { numero?: string; descricao?: string }): Promise<void> {
  exigirValida(d)
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  await updateDoc(doc(casasRef(cartaoId, quadraId), casaId), {
    numero: numero ? numero.valor : deleteField(),
    descricao: descricao ? descricao.valor : deleteField(),
  })
}

export async function registrarVisita(a: { cartao: Cartao; quadraId: string; casa: Casa; novoStatus: Status; obs?: string; usuario: Usuario }): Promise<void> {
  const { cartao, quadraId, casa, novoStatus, usuario } = a
  if (!podeRegistrar(cartao)) throw new Error('Cartão fechado')
  const agora = paraTimestamp(Date.now())
  const delta = deltaResolvidas(casa.status, novoStatus)
  const obs = a.obs?.trim()
  const batch = writeBatch(db)
  batch.set(doc(collection(casasRef(cartao.id, quadraId), casa.id, 'visits')), {
    status: novoStatus,
    em: agora,
    porUid: usuario.uid,
    porNome: usuario.nome,
    ciclo: cartao.ciclo,
    ...(obs && { obs }),
  })
  batch.update(doc(casasRef(cartao.id, quadraId), casa.id), { status: novoStatus, ultimaVisitaEm: agora, ultimoPor: usuario.nome })
  const fecha = deveFecharAuto({ estado: cartao.estado, totalCasas: cartao.totalCasas, resolvidas: cartao.resolvidas + delta })
  batch.update(cartaoRef(cartao.id), { resolvidas: increment(delta), atualizadoEm: agora, ...(fecha && fecharCartao(cartao)) })
  if (fecha) {
    batch.set(doc(collection(cartaoRef(cartao.id), 'eventos')), {
      tipo: 'fechado',
      motivo: 'fechamento_automatico',
      em: agora,
      porUid: usuario.uid,
      porNome: usuario.nome,
    })
  }
  await batch.commit()
}

const LOTE = 400

export async function reiniciarCartao(cartao: Cartao, casas: Casa[], usuario: Usuario): Promise<void> {
  const ids = new Set(idsParaReiniciar(casas))
  const alvo = casas.filter((c) => ids.has(c.id))
  if (alvo.some((c) => !c.quadraId)) throw new Error('Casa sem quadra: use as casas lidas por observarCasas')
  const agora = paraTimestamp(Date.now())
  const lotes: WriteBatch[] = []
  for (let i = 0; i < alvo.length; i += LOTE) {
    const batch = writeBatch(db)
    for (const c of alvo.slice(i, i + LOTE)) batch.update(doc(casasRef(cartao.id, c.quadraId as string), c.id), { status: 'pendente' satisfies Status })
    lotes.push(batch)
  }
  const ultimo = lotes.length ? lotes[lotes.length - 1] : writeBatch(db)
  if (!lotes.length) lotes.push(ultimo)
  ultimo.update(cartaoRef(cartao.id), {
    ...abrirCartao(cartao),
    resolvidas: casas.filter((c) => isResolvida(c.status) && !ids.has(c.id)).length,
    atualizadoEm: agora,
    abertoPorNome: usuario.nome,
    abertoEm: agora,
  })
  ultimo.set(doc(collection(cartaoRef(cartao.id), 'eventos')), { tipo: 'aberto', motivo: 'reinicio', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  for (const batch of lotes) await batch.commit()
}

export async function recalcularContadores(cartaoId: string): Promise<void> {
  const quadras = await getDocs(collection(db, 'cards', cartaoId, 'blocks'))
  let total = 0
  let resolvidas = 0
  for (const q of quadras.docs) {
    const casas = await getDocs(casasRef(cartaoId, q.id))
    for (const c of casas.docs) {
      total++
      if (isResolvida(casaDe(c.id, q.id, c.data()).status)) resolvidas++
    }
  }
  await updateDoc(cartaoRef(cartaoId), { totalCasas: total, resolvidas, atualizadoEm: paraTimestamp(Date.now()) })
}
