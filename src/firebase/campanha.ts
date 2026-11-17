import { collection, deleteDoc, deleteField, doc, getDocFromServer, getDocsFromServer, setDoc, updateDoc, writeBatch, type DocumentData, type DocumentReference, type Timestamp } from 'firebase/firestore'
import { estadoDaCasa, guardarCasa, type CartaoGuardado, type CasaGuardada } from '@/domain/campanha'
import { contribuicao } from '@/domain/status'
import type { Campanha, Status } from '@/domain/types'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'
import { db } from './app'
import { ouvirDocComCache } from './cache'
import { campanhaDe, casaDe, paraMs, paraTimestamp } from './converters'

type Usuario = { uid: string; nome: string }
type Escrita = { ref: DocumentReference; dados: DocumentData; novo?: boolean }

const LOTE = 400
const campanhaRef = () => doc(db, 'campanhas', 'atual')
const copiaCartoes = () => collection(campanhaRef(), 'cartoes')
const copiaCasas = () => collection(campanhaRef(), 'casas')

export function observarCampanha(cb: (c: Campanha | null) => void, onErro?: (e: Error) => void): () => void {
  if (demoAtivo()) return demo.observarCampanha(cb)
  return ouvirDocComCache('campanhas/atual', campanhaRef(), (snap) => cb(snap.exists() ? campanhaDe(snap.data()) : null), onErro)
}

async function gravar(escritas: Escrita[], tipo: 'update' | 'set' | 'delete' = 'update'): Promise<void> {
  // lotes em paralelo: cada documento aparece em um lote só, então a ordem entre lotes não importa
  const lotes: Promise<void>[] = []
  for (let i = 0; i < escritas.length; i += LOTE) {
    const batch = writeBatch(db)
    for (const e of escritas.slice(i, i + LOTE)) {
      if (tipo === 'delete') batch.delete(e.ref)
      else if (tipo === 'set' || e.novo) batch.set(e.ref, e.dados)
      else batch.update(e.ref, e.dados)
    }
    lotes.push(batch.commit())
  }
  await Promise.all(lotes)
}

/** Tudo o que o território tem agora, lido do servidor (o cache pode estar incompleto e gravaria números errados). */
type Territorio = { id: string; dados: DocumentData; ref: DocumentReference; quadras: { id: string; dados: DocumentData; ref: DocumentReference; casas: { id: string; dados: DocumentData; ref: DocumentReference }[] }[] }[]

async function lerTerritorio(): Promise<Territorio> {
  const cartoes = await getDocsFromServer(collection(db, 'cards'))
  // cartões, quadras e casas lidos em paralelo: em série seriam uma ida ao servidor por quadra
  return Promise.all(cartoes.docs.map(async (c) => {
    const quadras = await getDocsFromServer(collection(c.ref, 'blocks'))
    const lista = await Promise.all(quadras.docs.map(async (q) => {
      const casas = await getDocsFromServer(collection(q.ref, 'houses'))
      return { id: q.id, dados: q.data(), ref: q.ref, casas: casas.docs.map((x) => ({ id: x.id, dados: x.data(), ref: x.ref })) }
    }))
    return { id: c.id, dados: c.data(), ref: c.ref, quadras: lista }
  }))
}

async function apagarCopia(): Promise<void> {
  const [a, b] = await Promise.all([getDocsFromServer(copiaCartoes()), getDocsFromServer(copiaCasas())])
  await gravar([...a.docs, ...b.docs].map((d) => ({ ref: d.ref, dados: {} })), 'delete')
}

/** Guarda o que a retomada precisa: situação de cada cartão e quadra, e as casas que não estão Pendentes. */
async function guardarCopia(t: Territorio): Promise<void> {
  const escritas: Escrita[] = []
  for (const c of t) {
    const quadras: CartaoGuardado['quadras'] = {}
    for (const q of c.quadras) {
      const atual = q.dados.rodadaAtual as { id?: string; numero?: number; porNome?: string; em?: unknown } | undefined
      quadras[q.id] = {
        rodadasTotal: Number(q.dados.rodadasTotal ?? 0),
        ...(atual && typeof atual.id === 'string' && { rodadaAtual: { id: atual.id, numero: Number(atual.numero ?? 0), porNome: String(atual.porNome ?? ''), em: typeof atual.em === 'number' ? atual.em : (paraMs(atual.em) ?? 0) } }),
      }
      for (const x of q.casas) {
        const casa = casaDe(x.id, q.id, x.dados)
        const g = guardarCasa(c.id, q.id, casa)
        if (g) escritas.push({ ref: doc(copiaCasas(), x.id), dados: { ...g } })
      }
    }
    escritas.push({
      ref: doc(copiaCartoes(), c.id),
      dados: {
        estado: c.dados.estado === 'aberto' ? 'aberto' : 'fechado',
        ciclo: Number(c.dados.ciclo ?? 1),
        ...(typeof c.dados.abertoPorNome === 'string' && { abertoPorNome: c.dados.abertoPorNome }),
        ...(paraMs(c.dados.abertoEm) !== undefined && { abertoEm: paraMs(c.dados.abertoEm) }),
        quadras,
      },
    })
  }
  await gravar(escritas, 'set')
}

type Copia = { cartoes: Map<string, CartaoGuardado>; casas: Map<string, CasaGuardada> }

async function lerCopia(): Promise<Copia> {
  const [a, b] = await Promise.all([getDocsFromServer(copiaCartoes()), getDocsFromServer(copiaCasas())])
  return {
    cartoes: new Map(a.docs.map((d) => [d.id, d.data() as CartaoGuardado])),
    casas: new Map(b.docs.map((d) => [d.id, d.data() as CasaGuardada])),
  }
}

/**
 * Deixa o território no estado pedido: o da cópia (retomar) ou limpo (sem cópia). Limpo = casas Pendentes, nenhuma volta, cartões fechados.
 * Pode ser repetido sem efeito duplo: lê o que existe, regrava só o que difere e sempre refaz os contadores.
 */
async function aplicar(t: Territorio, copia: Copia | null, aberturaDoCiclo: boolean, usuario: Usuario): Promise<void> {
  const casasEscritas: Escrita[] = []
  const finais: Escrita[] = []
  const agora: Timestamp = paraTimestamp(Date.now())
  for (const c of t) {
    const gc = copia?.cartoes.get(c.id)
    let total = 0
    let resolvidas = 0
    for (const q of c.quadras) {
      const gq = gc?.quadras[q.id]
      let totalQuadra = 0
      let faltam = 0
      for (const x of q.casas) {
        const alvo = estadoDaCasa(copia?.casas.get(x.id))
        const atual = casaDe(x.id, q.id, x.dados)
        const igual = atual.status === alvo.status && atual.ultimaVisitaEm === alvo.ultimaVisitaEm && atual.ultimoPor === alvo.ultimoPor
        if (!igual) {
          casasEscritas.push({
            ref: x.ref,
            dados: {
              status: alvo.status,
              ultimaVisitaEm: alvo.ultimaVisitaEm !== undefined ? paraTimestamp(alvo.ultimaVisitaEm) : deleteField(),
              ultimoPor: alvo.ultimoPor !== undefined ? alvo.ultimoPor : deleteField(),
            },
          })
        }
        const conta = contribuicao({ status: alvo.status as Status, naoVisitar: atual.naoVisitar })
        totalQuadra += conta.total
        resolvidas += conta.resolvidas
        faltam += conta.faltam
      }
      total += totalQuadra
      // volta aberta que o estado novo não tem: encerra e registra; volta que ele tem e hoje está encerrada: reabre e registra
      const doQuadra = { quadraId: q.id, quadraRotulo: String(q.dados.rotulo ?? ''), porUid: usuario.uid, porNome: usuario.nome, em: agora }
      const rodadaAgora = q.dados.rodadaAtual as { id?: string; numero?: number } | undefined
      const idAgora = typeof rodadaAgora?.id === 'string' ? rodadaAgora.id : undefined
      const idAlvo = gq?.rodadaAtual?.id
      if (idAgora && idAgora !== idAlvo) {
        finais.push({ ref: doc(q.ref, 'rodadas', idAgora), dados: { encerradaPorUid: usuario.uid, encerradaPorNome: usuario.nome, encerradaEm: agora } })
        finais.push({ ref: doc(collection(c.ref, 'eventos')), novo: true, dados: { tipo: 'rodada', motivo: 'rodada_encerrada', rodada: Number(rodadaAgora?.numero ?? 0), ...doQuadra } })
      }
      if (gq?.rodadaAtual && idAlvo !== idAgora) {
        finais.push({ ref: doc(q.ref, 'rodadas', gq.rodadaAtual.id), dados: { encerradaPorUid: deleteField(), encerradaPorNome: deleteField(), encerradaEm: deleteField() } })
        finais.push({ ref: doc(collection(c.ref, 'eventos')), novo: true, dados: { tipo: 'rodada', motivo: 'rodada_aberta', rodada: gq.rodadaAtual.numero, ...doQuadra } })
      }
      finais.push({
        ref: q.ref,
        dados: {
          totalCasas: totalQuadra,
          faltam,
          rodadasTotal: gq ? gq.rodadasTotal : 0,
          rodadaAtual: gq?.rodadaAtual ?? deleteField(),
        },
      })
    }
    const abertoAgora = c.dados.estado === 'aberto'
    const abertoAlvo = gc ? gc.estado === 'aberto' : false
    if (abertoAgora && !abertoAlvo) finais.push({ ref: doc(collection(c.ref, 'eventos')), novo: true, dados: { tipo: 'fechado', motivo: 'fechamento_campanha', em: agora, porUid: usuario.uid, porNome: usuario.nome } })
    if (!abertoAgora && abertoAlvo) finais.push({ ref: doc(collection(c.ref, 'eventos')), novo: true, dados: { tipo: 'aberto', motivo: 'retomada_campanha', em: agora, porUid: usuario.uid, porNome: usuario.nome } })
    finais.push({
      ref: c.ref,
      dados: {
        estado: gc ? gc.estado : 'fechado',
        ciclo: gc ? gc.ciclo : Number(c.dados.ciclo ?? 1) + (aberturaDoCiclo ? 1 : 0),
        totalCasas: total,
        resolvidas,
        atualizadoEm: agora,
        abertoPorNome: gc?.abertoPorNome ?? deleteField(),
        abertoEm: gc?.abertoEm !== undefined ? paraTimestamp(gc.abertoEm) : deleteField(),
      },
    })
  }
  // casas primeiro, contas por último: se parar no meio, repetir refaz o que faltou
  await gravar(casasEscritas)
  // quadras, voltas e cartões num lote só quando cabe (500 escritas): voltas e contas mudam juntas e repetir não reencerra uma volta
  if (finais.length <= 490) {
    const batch = writeBatch(db)
    for (const e of finais) { if (e.novo) batch.set(e.ref, e.dados); else batch.update(e.ref, e.dados) }
    await batch.commit()
  } else await gravar(finais)
}

async function lerCampanha(): Promise<Campanha | null> {
  const snap = await getDocFromServer(campanhaRef())
  return snap.exists() ? campanhaDe(snap.data()) : null
}

/**
 * Começa a campanha. `guardar`: o trabalho de antes fica guardado para ser retomado no fim; senão o território começa do zero e o progresso de antes se perde.
 * Em ambos os casos os cartões começam limpos e fechados. Só administradores (regras do servidor). Online: lê e grava no servidor.
 */
export async function iniciarCampanha(d: { nome: string; resultados: Status[]; guardar: boolean }, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.iniciarCampanha(d, usuario)
  if (await lerCampanha()) throw new Error('Já existe uma campanha')
  // ler o território e limpar cópias antigas não dependem um do outro
  const [t] = await Promise.all([lerTerritorio(), apagarCopia()])
  if (d.guardar) await guardarCopia(t)
  await setDoc(campanhaRef(), {
    nome: d.nome.trim(), resultados: d.resultados, fase: 'iniciando', guardou: d.guardar,
    iniciadaEm: paraTimestamp(Date.now()), iniciadaPorNome: usuario.nome,
  })
  // o território não mudou desde a leitura: não lê de novo
  await aplicar(t, null, false, usuario)
  await updateDoc(campanhaRef(), { fase: 'ativa' })
}

/** Termina o que uma execução interrompida deixou no meio (iniciando ou encerrando). Também é o passo final de iniciar e de encerrar. */
export async function continuarCampanha(usuario: Usuario): Promise<void> {
  if (demoAtivo()) return
  const c = await lerCampanha()
  if (!c) return
  const t = await lerTerritorio()
  if (c.fase === 'iniciando') {
    await aplicar(t, null, false, usuario)
    await updateDoc(campanhaRef(), { fase: 'ativa' })
    return
  }
  if (c.fase === 'encerrando') {
    const retomar = c.retomar === true && c.guardou
    await aplicar(t, retomar ? await lerCopia() : null, !retomar, usuario)
    await apagarCopia()
    await deleteDoc(campanhaRef())
  }
}

/** Encerra a campanha. `retomar`: o território volta exatamente ao que era antes (só se foi guardado); senão recomeça do zero. */
export async function encerrarCampanha(d: { retomar: boolean }, usuario: Usuario): Promise<void> {
  if (demoAtivo()) return demo.encerrarCampanha(d, usuario)
  const c = await lerCampanha()
  if (!c) return
  await updateDoc(campanhaRef(), { fase: 'encerrando', retomar: d.retomar && c.guardou })
  await continuarCampanha(usuario)
}
