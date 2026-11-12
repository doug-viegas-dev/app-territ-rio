import { collection, deleteField, doc, getDocsFromServer, increment, orderBy, query, setDoc, updateDoc, writeBatch, type Timestamp, type WriteBatch } from 'firebase/firestore'
import { contadoresAposReinicio, estadoAposFecharEReiniciar, idsParaReiniciar, podeRegistrar } from '@/domain/ciclo'
import { validarCasa } from '@/domain/casa'
import { vencimentoDoRegistro } from '@/domain/historico'
import { ordemEntre, ordemFim, ordenarCasas, precisaRenumerar } from '@/domain/ordem'
import { podeFecharCartao } from '@/domain/rodada'
import { contribuicao, deltaContadores } from '@/domain/status'
import type { Cartao, Casa, Quadra, Status, Visita } from '@/domain/types'
import { db } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { ouvirComCache } from './cache'
import { casaDe, paraTimestamp, visitaDe } from './converters'

type Usuario = { uid: string; nome: string }
/** `quadraSemContadores`: a quadra ainda não tem totalCasas/faltam; somar criaria números errados, então só o cartão é atualizado. */
export type OpcoesQuadra = { quadraSemContadores?: boolean }

const casasRef = (cartaoId: string, quadraId: string) => collection(db, 'cards', cartaoId, 'blocks', quadraId, 'houses')
const cartaoRef = (cartaoId: string) => doc(db, 'cards', cartaoId)
const quadraRef = (cartaoId: string, quadraId: string) => doc(db, 'cards', cartaoId, 'blocks', quadraId)

/** `semDados` é verdadeiro quando a lista veio vazia só do cache: sem rede, isso não prova que a quadra não tem casas. */
export function observarCasas(cartaoId: string, quadraId: string, cb: (c: Casa[], semDados?: boolean) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarCasas(cartaoId, quadraId, cb)
  return ouvirComCache(
    `cards/${cartaoId}/blocks/${quadraId}/houses`,
    casasRef(cartaoId, quadraId),
    (snap) => cb(ordenarCasas(snap.docs.map((d) => casaDe(d.id, quadraId, d.data()))), snap.empty && snap.metadata.fromCache),
    onErro,
  )
}

export function observarVisitas(cartaoId: string, quadraId: string, casaId: string, cb: (v: Visita[]) => void): () => void {
  if (demoAtivo()) return demo.observarVisitas(cartaoId, quadraId, casaId, cb)
  const q = query(collection(db, 'cards', cartaoId, 'blocks', quadraId, 'houses', casaId, 'visits'), orderBy('em', 'desc'))
  return ouvirComCache(`cards/${cartaoId}/blocks/${quadraId}/houses/${casaId}/visits`, q, (snap) => cb(snap.docs.map((d) => visitaDe(d.id, d.data()))))
}

function exigirValida(d: { numero?: string; descricao?: string }): void {
  const erro = validarCasa(d)
  if (erro) throw new Error(erro)
}

const textoOuNada = (s?: string) => (s?.trim() ? { valor: s.trim() } : null)

/** `em` e `expiraEm` de um documento novo em `visits`: o registro vale por 2 anos. */
function quando(ms: number): { em: Timestamp; expiraEm: Timestamp } {
  return { em: paraTimestamp(ms), expiraEm: paraTimestamp(vencimentoDoRegistro(ms)) }
}

/** Soma o delta no cartão (totalCasas, resolvidas) e na quadra (totalCasas, faltam), se a quadra tiver contadores. */
function aplicarDelta(batch: WriteBatch, cartaoId: string, quadraId: string, d: ReturnType<typeof deltaContadores>, agora: Timestamp, op: OpcoesQuadra): void {
  batch.update(cartaoRef(cartaoId), {
    ...(d.total !== 0 && { totalCasas: increment(d.total) }),
    ...(d.resolvidas !== 0 && { resolvidas: increment(d.resolvidas) }),
    atualizadoEm: agora,
  })
  if (op.quadraSemContadores || (d.total === 0 && d.faltam === 0)) return
  batch.update(quadraRef(cartaoId, quadraId), {
    ...(d.total !== 0 && { totalCasas: increment(d.total) }),
    ...(d.faltam !== 0 && { faltam: increment(d.faltam) }),
  })
}

export async function criarCasa(
  cartaoId: string,
  quadraId: string,
  d: { rua: string; numero?: string; descricao?: string; depoisDe?: string; resultado?: { status: Status; usuario: Usuario; ciclo: number; rodada: number } },
  existentes: Casa[],
  op: OpcoesQuadra = {},
): Promise<string> {
  if (demoAtivo()) return demo.criarCasa(cartaoId, quadraId, d, existentes, op)
  exigirValida(d)
  const daRua = ordenarCasas(existentes.filter((c) => c.rua === d.rua))
  let ordem: number
  const i = d.depoisDe ? daRua.findIndex((c) => c.id === d.depoisDe) : -1
  if (i >= 0) ordem = ordemEntre(daRua[i].ordem, daRua[i + 1]?.ordem ?? null)
  else ordem = ordemFim(daRua.map((c) => c.ordem))
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  const ms = Date.now()
  const agora = paraTimestamp(ms)
  const ref = doc(casasRef(cartaoId, quadraId))
  const batch = writeBatch(db)
  const vizinha = i >= 0 ? daRua[i + 1] : undefined
  if (i >= 0 && vizinha && precisaRenumerar(daRua[i].ordem, vizinha.ordem)) {
    // Sem espaço entre as vizinhas (ou ordem repetida): renumera a rua e põe a casa nova logo depois da escolhida.
    daRua.forEach((c, k) => batch.update(doc(casasRef(cartaoId, quadraId), c.id), { ordem: k <= i ? k + 1 : k + 2 }))
    ordem = i + 2
  }
  const r = d.resultado && d.resultado.status !== 'pendente' ? d.resultado : undefined
  const status: Status = r ? r.status : 'pendente'
  batch.set(ref, {
    rua: d.rua,
    ...(numero && { numero: numero.valor }),
    ...(descricao && { descricao: descricao.valor }),
    ordem,
    status,
    criadoEm: agora,
    ...(r && { ultimaVisitaEm: agora, ultimoPor: r.usuario.nome }),
  })
  if (r) {
    batch.set(doc(collection(ref, 'visits')), { status, ...quando(ms), porUid: r.usuario.uid, porNome: r.usuario.nome, ciclo: r.ciclo, rodada: r.rodada })
  }
  aplicarDelta(batch, cartaoId, quadraId, deltaContadores(null, { status }), agora, op)
  await batch.commit()
  return ref.id
}

export async function criarCasasEmFaixa(cartaoId: string, quadraId: string, d: { rua: string; numeros: string[] }, existentes: Casa[], op: OpcoesQuadra = {}): Promise<void> {
  if (demoAtivo()) return demo.criarCasasEmFaixa(cartaoId, quadraId, d, existentes, op)
  const numeros = d.numeros.map((n) => n.trim()).filter(Boolean)
  if (!numeros.length) return
  const inicio = ordemFim(existentes.filter((c) => c.rua === d.rua).map((c) => c.ordem))
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  numeros.forEach((numero, i) => {
    batch.set(doc(casasRef(cartaoId, quadraId)), { rua: d.rua, numero, ordem: inicio + i, status: 'pendente', criadoEm: agora })
  })
  batch.update(cartaoRef(cartaoId), { totalCasas: increment(numeros.length), atualizadoEm: agora })
  if (!op.quadraSemContadores) batch.update(quadraRef(cartaoId, quadraId), { totalCasas: increment(numeros.length), faltam: increment(numeros.length) })
  await batch.commit()
}

export async function moverCasa(
  cartaoId: string,
  quadraId: string,
  casaId: string,
  destino: { rua: string; antes: Casa | null; depois: Casa | null },
  ruaCasas: Casa[],
): Promise<void> {
  if (demoAtivo()) return demo.moverCasa(cartaoId, quadraId, casaId, destino, ruaCasas)
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
  if (demoAtivo()) return demo.editarCasa(cartaoId, quadraId, casaId, d)
  exigirValida(d)
  const numero = textoOuNada(d.numero)
  const descricao = textoOuNada(d.descricao)
  await updateDoc(doc(casasRef(cartaoId, quadraId), casaId), {
    numero: numero ? numero.valor : deleteField(),
    descricao: descricao ? descricao.valor : deleteField(),
  })
}

/** Apaga a casa e ajusta os contadores do cartão e da quadra. O histórico de visitas fica sem uso (as regras não permitem apagá-lo). */
export async function excluirCasa(cartaoId: string, quadraId: string, casa: Casa, op: OpcoesQuadra = {}): Promise<void> {
  if (demoAtivo()) return demo.excluirCasa(cartaoId, quadraId, casa, op)
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.delete(doc(casasRef(cartaoId, quadraId), casa.id))
  aplicarDelta(batch, cartaoId, quadraId, deltaContadores(casa, null), agora, op)
  await batch.commit()
}

export async function registrarVisita(a: { cartao: Cartao; quadraId: string; rodada: number; casa: Casa; novoStatus: Status; usuario: Usuario } & OpcoesQuadra): Promise<void> {
  if (demoAtivo()) return demo.registrarVisita(a)
  const { cartao, quadraId, casa, novoStatus, usuario } = a
  if (!podeRegistrar(cartao)) throw new Error('Cartão fechado')
  if (casa.naoVisitar) throw new Error('Casa marcada como não visitar')
  const ms = Date.now()
  const agora = paraTimestamp(ms)
  const batch = writeBatch(db)
  batch.set(doc(collection(casasRef(cartao.id, quadraId), casa.id, 'visits')), {
    status: novoStatus,
    ...quando(ms),
    porUid: usuario.uid,
    porNome: usuario.nome,
    ciclo: cartao.ciclo,
    rodada: a.rodada,
  })
  batch.update(doc(casasRef(cartao.id, quadraId), casa.id), { status: novoStatus, ultimaVisitaEm: agora, ultimoPor: usuario.nome })
  aplicarDelta(batch, cartao.id, quadraId, deltaContadores(casa, { ...casa, status: novoStatus }), agora, a)
  await batch.commit()
}

/** Liga ou desliga uma marca da casa com quem e quando. "Não visitar" tira a casa (ou devolve) das contas; repetir a mesma marcação não faz nada. */
export async function marcarCasa(a: { cartaoId: string; quadraId: string; casa: Casa; marca: 'naoVisitar' | 'estudo'; ligada: boolean; usuario: Usuario } & OpcoesQuadra): Promise<void> {
  if (demoAtivo()) return demo.marcarCasa(a)
  const { cartaoId, quadraId, casa, marca, ligada, usuario } = a
  if (!!casa[marca] === ligada) return
  const agora = paraTimestamp(Date.now())
  const batch = writeBatch(db)
  batch.update(
    doc(casasRef(cartaoId, quadraId), casa.id),
    ligada
      ? { [marca]: true, [`${marca}Por`]: usuario.nome, [`${marca}Em`]: agora }
      : { [marca]: deleteField(), [`${marca}Por`]: deleteField(), [`${marca}Em`]: deleteField() },
  )
  if (marca === 'naoVisitar') aplicarDelta(batch, cartaoId, quadraId, deltaContadores(casa, { ...casa, naoVisitar: ligada }), agora, a)
  await batch.commit()
}

/** Observação: um registro no histórico sem status; não muda a casa nem os contadores. */
export async function salvarObservacao(a: { cartaoId: string; quadraId: string; casaId: string; ciclo: number; texto: string; usuario: Usuario }): Promise<void> {
  if (demoAtivo()) return demo.salvarObservacao(a)
  const obs = a.texto.trim()
  if (!obs) throw new Error('Observação vazia')
  await setDoc(doc(collection(casasRef(a.cartaoId, a.quadraId), a.casaId, 'visits')), {
    obs,
    ...quando(Date.now()),
    porUid: a.usuario.uid,
    porNome: a.usuario.nome,
    ciclo: a.ciclo,
  })
}

const LOTE = 400

/** Fecha o cartão e começa o ciclo seguinte: todas as casas voltam a Pendente (as marcas ficam) e o cartão fica fechado até um administrador abri-lo. */
export async function fecharEReiniciarCartao(cartao: Cartao, casas: Casa[], quadras: Quadra[], usuario: Usuario): Promise<void> {
  if (!podeFecharCartao(quadras)) throw new Error('Rodada aberta')
  if (demoAtivo()) return demo.fecharEReiniciarCartao(cartao, casas, quadras, usuario)
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
    ...estadoAposFecharEReiniciar(cartao),
    totalCasas: contadoresAposReinicio(casas).totalCasas,
    resolvidas: 0,
    atualizadoEm: agora,
  })
  for (const q of quadras) {
    // gravar totalCasas também conserta quadras antigas, sem contadores
    ultimo.update(quadraRef(cartao.id, q.id), contadoresAposReinicio(casas.filter((c) => c.quadraId === q.id)))
  }
  ultimo.set(doc(collection(cartaoRef(cartao.id), 'eventos')), { tipo: 'fechado', motivo: 'fechamento_reinicio', em: agora, porUid: usuario.uid, porNome: usuario.nome })
  for (const batch of lotes) await batch.commit()
}

export async function recalcularContadores(cartaoId: string): Promise<void> {
  if (demoAtivo()) return demo.recalcularContadores(cartaoId)
  // Só do servidor: o cache pode ter quadras ou casas faltando e gravaria contadores errados.
  const quadras = await getDocsFromServer(collection(db, 'cards', cartaoId, 'blocks'))
  const batch = writeBatch(db)
  let total = 0
  let resolvidas = 0
  for (const q of quadras.docs) {
    const casas = await getDocsFromServer(casasRef(cartaoId, q.id))
    let totalQuadra = 0
    let faltam = 0
    for (const c of casas.docs) {
      const conta = contribuicao(casaDe(c.id, q.id, c.data()))
      totalQuadra += conta.total
      resolvidas += conta.resolvidas
      faltam += conta.faltam
    }
    total += totalQuadra
    batch.update(q.ref, { totalCasas: totalQuadra, faltam })
  }
  batch.update(cartaoRef(cartaoId), { totalCasas: total, resolvidas, atualizadoEm: paraTimestamp(Date.now()) })
  await batch.commit()
}
