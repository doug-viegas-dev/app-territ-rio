// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/app'
import { abrirCartaoManual, criarCartao, observarCartao, observarEventos } from '@/firebase/cards'
import { criarQuadra, observarQuadras } from '@/firebase/blocks'
import { abrirRodada } from '@/firebase/rodadas'
import {
  criarCasa,
  criarCasasEmFaixa,
  editarCasa,
  excluirCasa,
  fecharEReiniciarCartao,
  marcarCasa,
  moverCasa,
  observarCasas,
  observarVisitas,
  recalcularContadores,
  registrarVisita,
  salvarObservacao,
} from '@/firebase/houses'
import { vencimentoDoRegistro } from '@/domain/historico'
import type { Cartao, Casa, EventoCartao, Quadra, Status, Visita } from '@/domain/types'

vi.hoisted(() => {
  Object.assign(import.meta.env, { VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_PROJECT_ID: 'demo-meu-territorio' })
})

const hostPort = (valor: string | undefined, padrao: string): [string, number] => {
  const [host, porta] = (valor ?? padrao).split(':')
  return [host, Number(porta)]
}
const [firestoreHost, firestorePort] = hostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
const [authHost, authPort] = hostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
// o uid real vem do emulador de Auth; as regras exigem porUid == auth.uid
const admin = { uid: '', nome: 'Admin' }
const ana = { uid: '', nome: 'Ana' }
const espera = (ms = 5) => new Promise((r) => setTimeout(r, ms))

function proximo<T>(observar: (cb: (v: T) => void) => () => void, pronto: (v: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve) => {
    let feito = false
    const parar = observar((v) => {
      if (feito || !pronto(v)) return
      feito = true
      queueMicrotask(() => parar())
      resolve(v)
    })
  })
}
const cartaoAtual = (id: string, pronto: (c: Cartao) => boolean = () => true) =>
  proximo<Cartao | null>((cb) => observarCartao(id, cb), (c) => c !== null && pronto(c)).then((c) => c as Cartao)
const quadrasDe = (cartao: string, pronto: (l: Quadra[]) => boolean = () => true) =>
  proximo<Quadra[]>((cb) => observarQuadras(cartao, cb), pronto)
const quadraAtual = (cartao: string, id: string, pronto: (q: Quadra) => boolean = () => true) =>
  quadrasDe(cartao, (l) => l.some((q) => q.id === id && pronto(q))).then((l) => l.find((q) => q.id === id) as Quadra)
const eventos = (id: string) => proximo<EventoCartao[]>((cb) => observarEventos(id, cb))
const casasDe = (cartao: string, quadra: string, pronto: (l: Casa[]) => boolean = () => true) =>
  proximo<Casa[]>((cb) => observarCasas(cartao, quadra, cb), pronto)
const visitasDe = (cartao: string, quadra: string, casa: string, pronto: (l: Visita[]) => boolean = () => true) =>
  proximo<Visita[]>((cb) => observarVisitas(cartao, quadra, casa, cb), pronto)

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meu-territorio',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: firestoreHost, port: firestorePort },
  })
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'members/admin@example.com'), { nome: 'Admin', papel: 'admin', ativo: true })
  })
  connectFirestoreEmulator(db, firestoreHost, firestorePort)
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true })
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'admin-sub', email: 'admin@example.com', email_verified: true })))
  admin.uid = ana.uid = auth.currentUser?.uid ?? ''
}, 30000)
afterAll(async () => { if (env) await env.cleanup() })

let seq = 0
async function cenario(abrir = true) {
  const cartaoId = await criarCartao({ numero: String(++seq), titulo: `Cartão ${seq}` }, admin)
  if (abrir) await abrirCartaoManual(await cartaoAtual(cartaoId), admin, [])
  const quadraId = await criarQuadra(cartaoId, { rotulo: 'Q1', ruas: ['Rua A', 'Rua B'] })
  return { cartaoId, quadraId }
}
async function novaCasa(c: { cartaoId: string; quadraId: string }, d: { rua?: string; numero?: string; descricao?: string; depoisDe?: string; resultado?: { status: Status; usuario: { uid: string; nome: string }; ciclo: number; rodada: number } }) {
  const existentes = await casasDe(c.cartaoId, c.quadraId)
  const id = await criarCasa(c.cartaoId, c.quadraId, { rua: d.rua ?? 'Rua A', ...d }, existentes)
  await casasDe(c.cartaoId, c.quadraId, (l) => l.some((x) => x.id === id))
  return id
}
const ruaA = (l: Casa[], rua = 'Rua A') => l.filter((x) => x.rua === rua).map((x) => x.numero ?? x.descricao)

describe('criarCasa', () => {
  it('recusa casa sem número e sem descrição e não altera o contador', async () => {
    const c = await cenario()
    await expect(criarCasa(c.cartaoId, c.quadraId, { rua: 'Rua A' }, [])).rejects.toThrow()
    await expect(criarCasa(c.cartaoId, c.quadraId, { rua: 'Rua A', numero: ' ', descricao: ' ' }, [])).rejects.toThrow()
    expect((await cartaoAtual(c.cartaoId)).totalCasas).toBe(0)
    expect(await casasDe(c.cartaoId, c.quadraId)).toEqual([])
  })

  it('aceita número repetido na mesma rua e soma totalCasas', async () => {
    const c = await cenario()
    await novaCasa(c, { numero: '120' })
    await novaCasa(c, { numero: '120' })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 2)
    expect(l.map((x) => x.numero)).toEqual(['120', '120'])
    expect(l[0]).toMatchObject({ rua: 'Rua A', status: 'pendente' })
    expect((await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 2)).totalCasas).toBe(2)
  })

  it('novas casas entram no fim da rua e depoisDe insere entre vizinhas', async () => {
    const c = await cenario()
    const a = await novaCasa(c, { numero: '10' })
    await novaCasa(c, { numero: '30' })
    await novaCasa(c, { rua: 'Rua B', numero: '5' })
    await novaCasa(c, { numero: '20', depoisDe: a })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 4)
    expect(ruaA(l)).toEqual(['10', '20', '30'])
    expect(ruaA(l, 'Rua B')).toEqual(['5'])
  })

  it('depoisDe renumera a rua quando as vizinhas têm a mesma ordem (inserções offline)', async () => {
    const c = await cenario()
    const base = `cards/${c.cartaoId}/blocks/${c.quadraId}/houses`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      await setDoc(doc(f, `${base}/x1`), { rua: 'Rua A', numero: '1', ordem: 5, status: 'pendente', criadoEm: new Date(1) })
      await setDoc(doc(f, `${base}/x2`), { rua: 'Rua A', numero: '2', ordem: 5, status: 'pendente', criadoEm: new Date(2) })
      await setDoc(doc(f, `${base}/x3`), { rua: 'Rua A', numero: '3', ordem: 6, status: 'pendente', criadoEm: new Date(3) })
    })
    await casasDe(c.cartaoId, c.quadraId, (l) => l.length === 3)
    await novaCasa(c, { numero: '1b', depoisDe: 'x1' })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 4)
    expect(ruaA(l)).toEqual(['1', '1b', '2', '3'])
  })

  it('aceita só descrição e guarda os campos sem espaços nas pontas', async () => {
    const c = await cenario()
    await novaCasa(c, { descricao: '  portão azul ' })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 1)
    expect(l[0].descricao).toBe('portão azul')
    expect(l[0].numero).toBeUndefined()
  })
})

describe('criarCasa com contadores da quadra', () => {
  it('criarCasa pendente soma totalCasas e faltam', async () => {
    const c = await cenario()
    await novaCasa(c, { numero: '1' })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
  })

  it('criarCasa com resultado falado grava casa e visita no mesmo lote, com resolvidas +1 e faltam inalterado', async () => {
    const c = await cenario()
    const id = await novaCasa(c, { numero: '5', resultado: { status: 'falado', usuario: admin, ciclo: 1, rodada: 2 } })
    const casa = (await casasDe(c.cartaoId, c.quadraId)).find((x) => x.id === id) as Casa
    expect(casa).toMatchObject({ status: 'falado', ultimoPor: 'Admin' })
    const v = await visitasDe(c.cartaoId, c.quadraId, id, (l) => l.length === 1)
    expect(v[0]).toMatchObject({ status: 'falado', ciclo: 1, rodada: 2, porUid: admin.uid, porNome: 'Admin' })
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 0 })
  })

  it('criarCasa e excluirCasa respeitam a nova conta', async () => {
    const c = await cenario()
    const id = await novaCasa(c, { numero: '7', resultado: { status: 'carta', usuario: admin, ciclo: 1, rodada: 1 } })
    const v = await visitasDe(c.cartaoId, c.quadraId, id, (l) => l.length === 1)
    expect(v[0]).toMatchObject({ status: 'carta', ciclo: 1, rodada: 1 })
    expect(v[0].expiraEm).toBe(vencimentoDoRegistro(v[0].em))
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 0 })

    const outra = await novaCasa(c, { numero: '9' })
    const pendente = (await casasDe(c.cartaoId, c.quadraId)).find((x) => x.id === outra) as Casa
    await marcarCasa({ cartaoId: c.cartaoId, quadraId: c.quadraId, casa: pendente, marca: 'naoVisitar', ligada: true, usuario: admin })
    const marcada = (await casasDe(c.cartaoId, c.quadraId, (l) => !!l.find((x) => x.id === outra)?.naoVisitar)).find((x) => x.id === outra) as Casa
    await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)
    await excluirCasa(c.cartaoId, c.quadraId, marcada)
    await casasDe(c.cartaoId, c.quadraId, (l) => l.length === 1)
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ totalCasas: 1, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toMatchObject({ totalCasas: 1, faltam: 0 })
  })

  it('criarCasa com resultado pendente ou sem resultado não cria visita', async () => {
    const c = await cenario()
    const comPendente = await novaCasa(c, { numero: '8', resultado: { status: 'pendente', usuario: admin, ciclo: 1, rodada: 1 } })
    const semResultado = await novaCasa(c, { numero: '9' })
    // as duas casas já existem; a visita, se existisse, foi gravada no mesmo lote
    expect(await visitasDe(c.cartaoId, c.quadraId, comPendente)).toEqual([])
    expect(await visitasDe(c.cartaoId, c.quadraId, semResultado)).toEqual([])
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 2)).toMatchObject({ totalCasas: 2, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 2)).toMatchObject({ totalCasas: 2, faltam: 2 })
  })

  it('criarCasa com resultado sem_resposta soma faltam', async () => {
    const c = await cenario()
    await novaCasa(c, { numero: '6', resultado: { status: 'sem_resposta', usuario: admin, ciclo: 1, rodada: 1 } })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ resolvidas: 0 })
  })
})

describe('criarCasasEmFaixa', () => {
  it('cria na ordem crescente, em um batch, e soma totalCasas', async () => {
    const c = await cenario()
    await novaCasa(c, { numero: '98' })
    const existentes = await casasDe(c.cartaoId, c.quadraId)
    await criarCasasEmFaixa(c.cartaoId, c.quadraId, { rua: 'Rua A', numeros: ['100', '102', '104', '106'] }, existentes)
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 5)
    expect(ruaA(l)).toEqual(['98', '100', '102', '104', '106'])
    expect((await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 5)).totalCasas).toBe(5)
  })

  it('criarCasasEmFaixa soma o tamanho da faixa em totalCasas e faltam', async () => {
    const c = await cenario()
    await criarCasasEmFaixa(c.cartaoId, c.quadraId, { rua: 'Rua A', numeros: ['1', '3', '5'] }, [])
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 3)).toMatchObject({ totalCasas: 3, faltam: 3 })
  })
})

describe('excluirCasa', () => {
  it('excluirCasa de casa que falta reduz faltam e totalCasas', async () => {
    const c = await cenario()
    const id = await novaCasa(c, { numero: '1' })
    await novaCasa(c, { numero: '2' })
    const casa = (await casasDe(c.cartaoId, c.quadraId)).find((x) => x.id === id) as Casa
    await excluirCasa(c.cartaoId, c.quadraId, casa)
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
  })

  it('excluirCasa de casa resolvida reduz resolvidas', async () => {
    const c = await cenario()
    const id = await novaCasa(c, { numero: '1', resultado: { status: 'falado', usuario: admin, ciclo: 1, rodada: 1 } })
    await novaCasa(c, { numero: '2' })
    const casa = (await casasDe(c.cartaoId, c.quadraId, (l) => l.find((x) => x.id === id)?.status === 'falado')).find((x) => x.id === id) as Casa
    await excluirCasa(c.cartaoId, c.quadraId, casa)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })
})

describe('moverCasa', () => {
  it('altera só o doc movido e troca de rua quando preciso', async () => {
    const c = await cenario()
    const a = await novaCasa(c, { numero: '1' })
    const b = await novaCasa(c, { numero: '2' })
    const d = await novaCasa(c, { numero: '3' })
    const antes = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 3)
    const por = (id: string) => antes.find((x) => x.id === id) as Casa
    await moverCasa(c.cartaoId, c.quadraId, d, { rua: 'Rua A', antes: null, depois: por(a) }, antes.filter((x) => x.rua === 'Rua A'))
    const depois = await casasDe(c.cartaoId, c.quadraId, (x) => x.find((y) => y.id === d)?.ordem !== por(d).ordem)
    expect(ruaA(depois)).toEqual(['3', '1', '2'])
    expect(depois.find((x) => x.id === a)?.ordem).toBe(por(a).ordem)
    expect(depois.find((x) => x.id === b)?.ordem).toBe(por(b).ordem)

    await moverCasa(c.cartaoId, c.quadraId, b, { rua: 'Rua B', antes: null, depois: null }, [])
    const final = await casasDe(c.cartaoId, c.quadraId, (x) => x.find((y) => y.id === b)?.rua === 'Rua B')
    expect(ruaA(final, 'Rua B')).toEqual(['2'])
    expect(final.find((x) => x.id === a)?.ordem).toBe(por(a).ordem)
  })

  it('renumera a rua inteira (1..n) quando as vizinhas estão a 1e-7', async () => {
    const c = await cenario()
    const base = `cards/${c.cartaoId}/blocks/${c.quadraId}/houses`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      const nova = (id: string, numero: string, ordem: number) =>
        setDoc(doc(f, `${base}/${id}`), { rua: 'Rua A', numero, ordem, status: 'pendente', criadoEm: new Date() })
      await nova('x1', '1', 5)
      await nova('x2', '2', 5.0000001)
      await nova('x3', '3', 9)
    })
    const antes = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 3)
    const [x1, x2] = ['x1', 'x2'].map((id) => antes.find((x) => x.id === id) as Casa)
    await moverCasa(c.cartaoId, c.quadraId, 'x3', { rua: 'Rua A', antes: x1, depois: x2 }, antes)
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.some((y) => y.ordem === 1))
    expect(ruaA(l)).toEqual(['1', '3', '2'])
    expect(l.map((x) => x.ordem).sort()).toEqual([1, 2, 3])
  })

  it('duas casas com a mesma ordem continuam visíveis e em ordem estável', async () => {
    const c = await cenario()
    const base = `cards/${c.cartaoId}/blocks/${c.quadraId}/houses`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      await setDoc(doc(f, `${base}/b`), { rua: 'Rua A', numero: '2', ordem: 3, status: 'pendente', criadoEm: new Date(2000) })
      await setDoc(doc(f, `${base}/a`), { rua: 'Rua A', numero: '1', ordem: 3, status: 'pendente', criadoEm: new Date(1000) })
    })
    const um = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 2)
    const dois = await casasDe(c.cartaoId, c.quadraId, (x) => x.length === 2)
    expect(um.map((x) => x.id)).toEqual(['a', 'b'])
    expect(dois.map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('editarCasa', () => {
  it('revalida e grava', async () => {
    const c = await cenario()
    const id = await novaCasa(c, { numero: '7' })
    await expect(editarCasa(c.cartaoId, c.quadraId, id, { numero: '', descricao: '' })).rejects.toThrow()
    await editarCasa(c.cartaoId, c.quadraId, id, { numero: '7A', descricao: 'esquina' })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x[0]?.numero === '7A')
    expect(l[0]).toMatchObject({ numero: '7A', descricao: 'esquina' })
  })
})

describe('registrarVisita', () => {
  async function comCasas(n: number, abrir = true) {
    const c = await cenario(abrir)
    for (let i = 1; i <= n; i++) await novaCasa(c, { numero: String(i) })
    const casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.length === n)
    return { ...c, casas }
  }
  const registrar = async (c: { cartaoId: string; quadraId: string }, casa: Casa, novoStatus: Status, usuario = admin) => {
    const cartao = await cartaoAtual(c.cartaoId)
    await registrarVisita({ cartao, quadraId: c.quadraId, rodada: 1, casa, novoStatus, usuario })
  }
  const casaAtual = async (c: { cartaoId: string; quadraId: string }, id: string, status: Status) =>
    (await casasDe(c.cartaoId, c.quadraId, (l) => l.find((x) => x.id === id)?.status === status)).find((x) => x.id === id) as Casa

  it('cria a visita com o ciclo do cartão e atualiza a casa e os contadores', async () => {
    const c = await comCasas(3)
    const [c1] = c.casas
    await registrar(c, c1, 'falado', ana)
    const casa = await casaAtual(c, c1.id, 'falado')
    expect(casa).toMatchObject({ status: 'falado', ultimoPor: 'Ana' })
    expect(typeof casa.ultimaVisitaEm).toBe('number')
    const v = await visitasDe(c.cartaoId, c.quadraId, c1.id, (l) => l.length === 1)
    expect(v[0]).toMatchObject({ status: 'falado', ciclo: 1, porUid: ana.uid, porNome: 'Ana' })
    expect((await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 1)).resolvidas).toBe(1)
  })

  it('registrarVisita grava expiraEm dois anos depois e não aceita obs', async () => {
    const c = await comCasas(1)
    const cartao = await cartaoAtual(c.cartaoId)
    const comObs = { cartao, quadraId: c.quadraId, rodada: 1, casa: c.casas[0], novoStatus: 'falado', usuario: ana, obs: 'não deve ser gravada' } as Parameters<typeof registrarVisita>[0]
    await registrarVisita(comObs)
    const [v] = await visitasDe(c.cartaoId, c.quadraId, c.casas[0].id, (l) => l.length === 1)
    expect(v.status).toBe('falado')
    expect(v.expiraEm).toBe(vencimentoDoRegistro(v.em))
    expect(v.expiraEm).toBeGreaterThan(v.em + 2 * 365 * 24 * 60 * 60 * 1000 - 1)
    expect(v.obs).toBeUndefined()
  })

  it('registrarVisita recusa casa marcada como não visitar', async () => {
    const c = await comCasas(2)
    await marcarCasa({ cartaoId: c.cartaoId, quadraId: c.quadraId, casa: c.casas[0], marca: 'naoVisitar', ligada: true, usuario: admin })
    const marcada = (await casasDe(c.cartaoId, c.quadraId, (l) => !!l.find((x) => x.id === c.casas[0].id)?.naoVisitar)).find((x) => x.id === c.casas[0].id) as Casa
    await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)
    await expect(registrar(c, marcada, 'falado')).rejects.toThrow('Casa marcada como não visitar')
    expect(await visitasDe(c.cartaoId, c.quadraId, marcada.id)).toEqual([])
    expect((await casasDe(c.cartaoId, c.quadraId)).find((x) => x.id === marcada.id)?.status).toBe('pendente')
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })

  it('registrarVisita com carta e conversado soma em resolvidas; não em casa não soma', async () => {
    const c = await comCasas(3)
    const [c1, c2, c3] = c.casas
    await registrar(c, c1, 'carta')
    await registrar(c, c2, 'falado')
    await registrar(c, c3, 'nao_em_casa')
    await casaAtual(c, c3.id, 'nao_em_casa')
    expect(await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 2)).toMatchObject({ totalCasas: 3, resolvidas: 2 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 1)).toMatchObject({ totalCasas: 3, faltam: 1 })
  })

  it('contador: +1 de pendente a falado, 0 de falado a carta, −1 de carta a sem_resposta', async () => {
    const c = await comCasas(3)
    const [c1] = c.casas
    await registrar(c, c1, 'falado')
    await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 1)
    await registrar(c, await casaAtual(c, c1.id, 'falado'), 'carta')
    await casaAtual(c, c1.id, 'carta')
    expect((await cartaoAtual(c.cartaoId)).resolvidas).toBe(1)
    await registrar(c, await casaAtual(c, c1.id, 'carta'), 'sem_resposta')
    expect((await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 0)).resolvidas).toBe(0)
    expect((await cartaoAtual(c.cartaoId)).totalCasas).toBe(3)
    expect(await visitasDe(c.cartaoId, c.quadraId, c1.id, (l) => l.length === 3)).toHaveLength(3)
  })

  it('visitas vêm da mais recente para a mais antiga', async () => {
    const c = await comCasas(2)
    const [c1] = c.casas
    await registrar(c, c1, 'sem_resposta')
    await espera(15)
    await registrar(c, await casaAtual(c, c1.id, 'sem_resposta'), 'falado')
    const v = await visitasDe(c.cartaoId, c.quadraId, c1.id, (l) => l.length === 2)
    expect(v.map((x) => x.status)).toEqual(['falado', 'sem_resposta'])
  })

  it('registrarVisita grava a rodada na visita', async () => {
    const c = await comCasas(1)
    const cartao = await cartaoAtual(c.cartaoId)
    await registrarVisita({ cartao, quadraId: c.quadraId, rodada: 3, casa: c.casas[0], novoStatus: 'falado', usuario: admin })
    const v = await visitasDe(c.cartaoId, c.quadraId, c.casas[0].id, (l) => l.length === 1)
    expect(v[0]).toMatchObject({ status: 'falado', rodada: 3, ciclo: 1 })
  })

  it('registrarVisita da última casa não fecha o cartão', async () => {
    const c = await comCasas(2)
    await registrar(c, c.casas[0], 'falado')
    await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 1)
    await espera()
    await registrar(c, c.casas[1], 'carta', ana)
    const fim = await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 2)
    expect(fim).toMatchObject({ estado: 'aberto', ciclo: 1, resolvidas: 2, totalCasas: 2 })
    expect((await eventos(c.cartaoId)).some((e) => e.motivo === 'fechamento_automatico')).toBe(false)
  })

  it('registrarVisita ajusta faltam da quadra', async () => {
    const c = await comCasas(3)
    const [c1] = c.casas
    expect((await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 3)).faltam).toBe(3)
    await registrar(c, c1, 'falado')
    expect((await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 2)).faltam).toBe(2)
    await registrar(c, await casaAtual(c, c1.id, 'falado'), 'sem_resposta')
    expect((await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 3)).faltam).toBe(3)
  })

  it('cartão com 1 casa sem_resposta não fecha', async () => {
    const c = await comCasas(1)
    await registrar(c, c.casas[0], 'sem_resposta')
    await casaAtual(c, c.casas[0].id, 'sem_resposta')
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ estado: 'aberto', ciclo: 1, resolvidas: 0 })
  })

  it('em cartão fechado lança erro e não grava nada', async () => {
    const c = await comCasas(2, false)
    const cartao = await cartaoAtual(c.cartaoId)
    expect(cartao.estado).toBe('fechado')
    await expect(registrarVisita({ cartao, quadraId: c.quadraId, casa: c.casas[0], novoStatus: 'falado', rodada: 1, usuario: admin })).rejects.toThrow('Cartão fechado')
    expect(await visitasDe(c.cartaoId, c.quadraId, c.casas[0].id)).toEqual([])
    expect((await casasDe(c.cartaoId, c.quadraId))[0].status).toBe('pendente')
    expect((await cartaoAtual(c.cartaoId)).resolvidas).toBe(0)
  })
})

describe('marcas da casa e observação', () => {
  async function comCasas(n: number) {
    const c = await cenario()
    for (let i = 1; i <= n; i++) await novaCasa(c, { numero: String(i) })
    const casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.length === n)
    return { ...c, casas }
  }
  type C = { cartaoId: string; quadraId: string }
  const casaQue = async (c: C, id: string, pronto: (x: Casa) => boolean) =>
    (await casasDe(c.cartaoId, c.quadraId, (l) => l.some((x) => x.id === id && pronto(x)))).find((x) => x.id === id) as Casa
  const marcar = (c: C, casa: Casa, marca: 'naoVisitar' | 'estudo', ligada: boolean, usuario = ana) =>
    marcarCasa({ cartaoId: c.cartaoId, quadraId: c.quadraId, casa, marca, ligada, usuario })
  const conversado = async (c: C, casa: Casa) => {
    await registrarVisita({ cartao: await cartaoAtual(c.cartaoId), quadraId: c.quadraId, rodada: 1, casa, novoStatus: 'falado', usuario: admin })
    await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 1)
    return casaQue(c, casa.id, (x) => x.status === 'falado')
  }
  const camposDaCasa = async (c: C, id: string) => {
    let dados: Record<string, unknown> = {}
    await env.withSecurityRulesDisabled(async (ctx) => {
      dados = (await getDoc(doc(ctx.firestore(), `cards/${c.cartaoId}/blocks/${c.quadraId}/houses/${id}`))).data() ?? {}
    })
    return dados
  }

  it('marcarCasa naoVisitar numa casa Conversado tira da conta', async () => {
    const c = await comCasas(2)
    const falada = await conversado(c, c.casas[0])
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 1)).toMatchObject({ totalCasas: 2, faltam: 1 })
    await marcar(c, falada, 'naoVisitar', true)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
    const casa = await casaQue(c, falada.id, (x) => !!x.naoVisitar)
    expect(casa).toMatchObject({ naoVisitar: true, naoVisitarPor: 'Ana', status: 'falado' })
    expect(typeof casa.naoVisitarEm).toBe('number')
  })

  it('marcarCasa naoVisitar numa casa Pendente', async () => {
    const c = await comCasas(2)
    await marcar(c, c.casas[0], 'naoVisitar', true)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })

  it('marcarCasa desmarcar devolve às contas', async () => {
    const c = await comCasas(2)
    const falada = await conversado(c, c.casas[0])
    await marcar(c, falada, 'naoVisitar', true)
    await marcar(c, c.casas[1], 'naoVisitar', true)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 0)).toMatchObject({ totalCasas: 0, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 0)).toMatchObject({ totalCasas: 0, faltam: 0 })
    const l = await casasDe(c.cartaoId, c.quadraId, (x) => x.every((y) => y.naoVisitar))
    for (const casa of l) await marcar(c, casa, 'naoVisitar', false)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 2)).toMatchObject({ totalCasas: 2, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 2)).toMatchObject({ totalCasas: 2, faltam: 1 })
    await casasDe(c.cartaoId, c.quadraId, (x) => x.every((y) => !y.naoVisitar))
    for (const casa of l) {
      const d = await camposDaCasa(c, casa.id)
      expect('naoVisitar' in d || 'naoVisitarPor' in d || 'naoVisitarEm' in d).toBe(false)
    }
  })

  it('marcarCasa repetida não conta duas vezes', async () => {
    const c = await comCasas(2)
    await marcar(c, c.casas[0], 'naoVisitar', true)
    const marcada = await casaQue(c, c.casas[0].id, (x) => !!x.naoVisitar)
    await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 1)
    await marcar(c, marcada, 'naoVisitar', true)
    await marcar(c, c.casas[1], 'naoVisitar', false)
    await espera(50)
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })

  it('desmarcar troca o status antigo gravado (estudo) por pendente', async () => {
    const c = await comCasas(1)
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `cards/${c.cartaoId}/blocks/${c.quadraId}/houses/${c.casas[0].id}`), { status: 'estudo' }, { merge: true })
    })
    const legada = await casaQue(c, c.casas[0].id, (x) => !!x.estudo)
    expect(legada.status).toBe('pendente')
    await marcar(c, legada, 'estudo', false)
    await casaQue(c, legada.id, (x) => !x.estudo)
    expect(await camposDaCasa(c, legada.id)).toMatchObject({ status: 'pendente' })
  })

  it('registrarVisita numa casa com status antigo estudo mantém a marca', async () => {
    const c = await comCasas(1)
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `cards/${c.cartaoId}/blocks/${c.quadraId}/houses/${c.casas[0].id}`), { status: 'estudo', estudoPor: 'Ana' }, { merge: true })
    })
    const legada = await casaQue(c, c.casas[0].id, (x) => !!x.estudo)
    await registrarVisita({ cartao: await cartaoAtual(c.cartaoId), quadraId: c.quadraId, rodada: 1, casa: legada, novoStatus: 'falado', usuario: admin })
    await casaQue(c, legada.id, (x) => x.status === 'falado')
    expect(await camposDaCasa(c, legada.id)).toMatchObject({ status: 'falado', estudo: true, estudoPor: 'Ana' })
  })

  it('marcarCasa estudo só grava a marca', async () => {
    const c = await comCasas(2)
    await conversado(c, c.casas[0])
    await marcar(c, c.casas[1], 'estudo', true)
    const casa = await casaQue(c, c.casas[1].id, (x) => !!x.estudo)
    expect(casa).toMatchObject({ estudo: true, estudoPor: 'Ana', status: 'pendente' })
    expect(typeof casa.estudoEm).toBe('number')
    await espera(50)
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ totalCasas: 2, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toMatchObject({ totalCasas: 2, faltam: 1 })
    await marcar(c, casa, 'estudo', false)
    await casaQue(c, casa.id, (x) => !x.estudo)
    const d = await camposDaCasa(c, casa.id)
    expect('estudo' in d || 'estudoPor' in d || 'estudoEm' in d).toBe(false)
  })

  it('salvarObservacao grava visita sem status', async () => {
    const c = await comCasas(1)
    const [casa] = c.casas
    const base = { cartaoId: c.cartaoId, quadraId: c.quadraId, casaId: casa.id, ciclo: 1, usuario: ana }
    await expect(salvarObservacao({ ...base, texto: '' })).rejects.toThrow('Observação vazia')
    await expect(salvarObservacao({ ...base, texto: '   ' })).rejects.toThrow('Observação vazia')
    await salvarObservacao({ ...base, texto: '  voltar à tarde ' })
    const [v] = await visitasDe(c.cartaoId, c.quadraId, casa.id, (l) => l.length === 1)
    expect(v).toMatchObject({ obs: 'voltar à tarde', ciclo: 1, porUid: ana.uid, porNome: 'Ana' })
    expect(v.status).toBeUndefined()
    expect(v.expiraEm).toBe(vencimentoDoRegistro(v.em))
    const depois = (await casasDe(c.cartaoId, c.quadraId)).find((x) => x.id === casa.id) as Casa
    expect(depois.status).toBe('pendente')
    expect(depois.ultimaVisitaEm).toBeUndefined()
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ totalCasas: 1, resolvidas: 0 })
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })
})

describe('fecharEReiniciarCartao', () => {
  it('deixa o cartão fechado, ciclo +1, todas as casas Pendente com as marcas, contas sem Não visitar e um evento fechamento_reinicio', async () => {
    const c = await cenario()
    const q2 = await criarQuadra(c.cartaoId, { rotulo: 'Q2', ruas: ['Rua C'] })
    for (const n of ['1', '2', '3', '4']) await novaCasa(c, { numero: n })
    await criarCasasEmFaixa(c.cartaoId, q2, { rua: 'Rua C', numeros: ['10', '12'] }, [])
    let casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.length === 4)
    const status: Status[] = ['falado', 'carta', 'falado', 'sem_resposta']
    for (let i = 0; i < 4; i++) {
      await registrarVisita({ cartao: await cartaoAtual(c.cartaoId), quadraId: c.quadraId, rodada: 1, casa: casas[i], novoStatus: status[i], usuario: admin })
      await casasDe(c.cartaoId, c.quadraId, (l) => l.find((x) => x.id === casas[i].id)?.status === status[i])
    }
    casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.every((x) => x.status !== 'pendente'))
    // a 3ª (Conversado) pede para não ser visitada; a 2ª tem estudo
    await marcarCasa({ cartaoId: c.cartaoId, quadraId: c.quadraId, casa: casas[2], marca: 'naoVisitar', ligada: true, usuario: admin })
    await marcarCasa({ cartaoId: c.cartaoId, quadraId: c.quadraId, casa: casas[1], marca: 'estudo', ligada: true, usuario: admin })
    casas = await casasDe(c.cartaoId, c.quadraId, (l) => !!l[2].naoVisitar && !!l[1].estudo)
    const casas2 = await casasDe(c.cartaoId, q2, (l) => l.length === 2)
    const antes = await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 2 && x.totalCasas === 5)
    const quadras = await quadrasDe(c.cartaoId, (l) => l.length === 2 && l.every((q) => q.totalCasas > 0))
    await espera()
    await fecharEReiniciarCartao(antes, [...casas, ...casas2], quadras, ana)
    const fim = await cartaoAtual(c.cartaoId, (x) => x.ciclo === antes.ciclo + 1)
    expect(fim).toMatchObject({ estado: 'fechado', ciclo: antes.ciclo + 1, resolvidas: 0, totalCasas: 5 })
    const depois = await casasDe(c.cartaoId, c.quadraId, (l) => l.every((x) => x.status === 'pendente'))
    expect(depois.map((x) => x.status)).toEqual(['pendente', 'pendente', 'pendente', 'pendente'])
    expect(depois[2].naoVisitar).toBe(true)
    expect(depois[1].estudo).toBe(true)
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 3)).toMatchObject({ totalCasas: 3, faltam: 3 })
    expect(await quadraAtual(c.cartaoId, q2)).toMatchObject({ totalCasas: 2, faltam: 2 })
    const e = await eventos(c.cartaoId)
    expect(e.filter((x) => x.motivo === 'fechamento_reinicio')).toHaveLength(1)
    expect(e[0]).toMatchObject({ tipo: 'fechado', motivo: 'fechamento_reinicio', porUid: ana.uid, porNome: 'Ana' })
  })

  it('lança erro com rodada aberta e não grava nada', async () => {
    const c = await cenario()
    await novaCasa(c, { numero: '1', resultado: { status: 'falado', usuario: admin, ciclo: 1, rodada: 1 } })
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId), admin)
    const quadras = await quadrasDe(c.cartaoId, (l) => l.some((q) => !!q.rodadaAtual))
    const casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.some((x) => x.status === 'falado'))
    const cartao = await cartaoAtual(c.cartaoId, (x) => x.resolvidas === 1)
    await expect(fecharEReiniciarCartao(cartao, casas, quadras, admin)).rejects.toThrow('Rodada aberta')
    expect(await cartaoAtual(c.cartaoId)).toMatchObject({ estado: 'aberto', ciclo: cartao.ciclo, resolvidas: 1 })
    expect((await casasDe(c.cartaoId, c.quadraId))[0].status).toBe('falado')
  })

  it('divide em batches de até 400 casas', async () => {
    const c = await cenario()
    const base = `cards/${c.cartaoId}/blocks/${c.quadraId}/houses`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      for (let i = 0; i < 450; i++) await setDoc(doc(f, `${base}/h${i}`), { rua: 'Rua A', numero: String(i), ordem: i, status: 'falado', criadoEm: new Date(i) })
    })
    const casas = await casasDe(c.cartaoId, c.quadraId, (l) => l.length === 450)
    const quadras = await quadrasDe(c.cartaoId)
    await fecharEReiniciarCartao(await cartaoAtual(c.cartaoId), casas, quadras, admin)
    const depois = await casasDe(c.cartaoId, c.quadraId, (l) => l.every((x) => x.status === 'pendente'))
    expect(depois).toHaveLength(450)
    expect((await cartaoAtual(c.cartaoId, (x) => x.estado === 'fechado')).ciclo).toBe(2)
    expect((await quadraAtual(c.cartaoId, c.quadraId, (q) => q.faltam === 450)).faltam).toBe(450)
  }, 120000)
})

describe('recalcularContadores', () => {
  it('corrige contadores adulterados lendo todas as casas, de todas as quadras', async () => {
    const c = await cenario()
    const q2 = await criarQuadra(c.cartaoId, { rotulo: 'Q2', ruas: ['Rua C'] })
    const base = `cards/${c.cartaoId}/blocks`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      const casa = (q: string, id: string, status: string, extra: Record<string, unknown> = {}) =>
        setDoc(doc(f, `${base}/${q}/houses/${id}`), { rua: 'Rua A', numero: id, ordem: 1, status, criadoEm: new Date(), ...extra })
      await casa(c.quadraId, 'a', 'falado')
      await casa(c.quadraId, 'b', 'pendente')
      // marcada "não visitar" (campo novo e status antigo): fora de todas as contas
      await casa(q2, 'c', 'falado', { naoVisitar: true })
      await casa(q2, 'd', 'sem_resposta')
      await casa(q2, 'e', 'nao_visitar')
      await setDoc(doc(f, `cards/${c.cartaoId}`), { totalCasas: 99, resolvidas: 42 }, { merge: true })
    })
    await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 99)
    await recalcularContadores(c.cartaoId)
    const certo = await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 3)
    expect(certo).toMatchObject({ totalCasas: 3, resolvidas: 1 })
  })

  it('recalcularContadores corrige totalCasas e faltam da quadra', async () => {
    const c = await cenario()
    const q2 = await criarQuadra(c.cartaoId, { rotulo: 'Q2', ruas: ['Rua C'] })
    const base = `cards/${c.cartaoId}/blocks`
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      const casa = (q: string, id: string, status: string, extra: Record<string, unknown> = {}) =>
        setDoc(doc(f, `${base}/${q}/houses/${id}`), { rua: 'Rua A', numero: id, ordem: 1, status, criadoEm: new Date(), ...extra })
      await casa(c.quadraId, 'a', 'falado')
      await casa(c.quadraId, 'b', 'pendente')
      // marcada "não visitar" (campo novo e status antigo): fora de todas as contas
      await casa(q2, 'c', 'falado', { naoVisitar: true })
      await casa(q2, 'd', 'sem_resposta')
      await casa(q2, 'e', 'nao_visitar')
      await setDoc(doc(f, `${base}/${c.quadraId}`), { totalCasas: 77, faltam: 55 }, { merge: true })
    })
    await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 77)
    await recalcularContadores(c.cartaoId)
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 2)).toMatchObject({ totalCasas: 2, faltam: 1 })
    expect(await quadraAtual(c.cartaoId, q2, (q) => q.totalCasas === 1)).toMatchObject({ totalCasas: 1, faltam: 1 })
  })
})

describe('quadra antiga, sem contadores', () => {
  /** Quadra criada antes dos contadores por quadra: sem totalCasas nem faltam no documento. */
  async function antiga() {
    const c = await cenario()
    const quadraId = 'antiga'
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `cards/${c.cartaoId}/blocks/${quadraId}`), { rotulo: 'Antiga', ruas: ['Rua A'], ordem: 0, rodadasTotal: 0 })
    })
    const quadra = await quadraAtual(c.cartaoId, quadraId)
    return { cartaoId: c.cartaoId, quadraId, quadra }
  }
  const camposDaQuadra = async (cartaoId: string, quadraId: string) => {
    let dados: Record<string, unknown> = {}
    await env.withSecurityRulesDisabled(async (ctx) => {
      dados = (await getDoc(doc(ctx.firestore(), `cards/${cartaoId}/blocks/${quadraId}`))).data() ?? {}
    })
    return dados
  }
  const semContadores = (d: Record<string, unknown>) => !('totalCasas' in d) && !('faltam' in d)

  it('quadraDe marca a quadra como semContadores', async () => {
    const a = await antiga()
    expect(a.quadra.semContadores).toBe(true)
  })

  it('criarCasa, criarCasasEmFaixa, registrarVisita e excluirCasa não criam contadores na quadra e atualizam o cartão', async () => {
    const a = await antiga()
    const op = { quadraSemContadores: true }
    const id = await criarCasa(a.cartaoId, a.quadraId, { rua: 'Rua A', numero: '1' }, [], op)
    await cartaoAtual(a.cartaoId, (x) => x.totalCasas === 1)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)

    await criarCasasEmFaixa(a.cartaoId, a.quadraId, { rua: 'Rua A', numeros: ['3', '5'] }, await casasDe(a.cartaoId, a.quadraId, (l) => l.length === 1), op)
    await cartaoAtual(a.cartaoId, (x) => x.totalCasas === 3)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)

    const casa = (await casasDe(a.cartaoId, a.quadraId, (l) => l.length === 3)).find((x) => x.id === id) as Casa
    await registrarVisita({ cartao: await cartaoAtual(a.cartaoId), quadraId: a.quadraId, rodada: 1, casa, novoStatus: 'falado', usuario: admin, quadraSemContadores: true })
    expect((await cartaoAtual(a.cartaoId, (x) => x.resolvidas === 1)).resolvidas).toBe(1)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)

    const falado = (await casasDe(a.cartaoId, a.quadraId, (l) => l.find((x) => x.id === id)?.status === 'falado')).find((x) => x.id === id) as Casa
    await excluirCasa(a.cartaoId, a.quadraId, falado, op)
    expect(await cartaoAtual(a.cartaoId, (x) => x.totalCasas === 2)).toMatchObject({ totalCasas: 2, resolvidas: 0 })
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)
    expect((await quadraAtual(a.cartaoId, a.quadraId)).semContadores).toBe(true)
  })

  it('fecharEReiniciarCartao grava totalCasas e faltam na quadra antiga', async () => {
    const a = await antiga()
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore()
      const base = `cards/${a.cartaoId}/blocks/${a.quadraId}/houses`
      await setDoc(doc(f, `${base}/a`), { rua: 'Rua A', numero: '1', ordem: 1, status: 'falado', criadoEm: new Date(1) })
      await setDoc(doc(f, `${base}/b`), { rua: 'Rua A', numero: '2', ordem: 2, status: 'nao_visitar', criadoEm: new Date(2) })
      await setDoc(doc(f, `${base}/c`), { rua: 'Rua A', numero: '3', ordem: 3, status: 'pendente', criadoEm: new Date(3) })
    })
    const casas = await casasDe(a.cartaoId, a.quadraId, (l) => l.length === 3)
    const quadras = await quadrasDe(a.cartaoId, (l) => l.length === 2)
    await fecharEReiniciarCartao(await cartaoAtual(a.cartaoId), casas, quadras, admin)
    const q = await quadraAtual(a.cartaoId, a.quadraId, (x) => !x.semContadores)
    expect(q).toMatchObject({ totalCasas: 2, faltam: 2 })
    expect(q.semContadores).toBeUndefined()
  })

  it('quadraSemContadores não toca na quadra em nenhuma marca', async () => {
    const a = await antiga()
    const op = { quadraSemContadores: true }
    const id = await criarCasa(a.cartaoId, a.quadraId, { rua: 'Rua A', numero: '1' }, [], op)
    const casa = (await casasDe(a.cartaoId, a.quadraId, (l) => l.length === 1))[0]
    const base = { cartaoId: a.cartaoId, quadraId: a.quadraId, usuario: admin, quadraSemContadores: true }
    await marcarCasa({ ...base, casa, marca: 'naoVisitar', ligada: true })
    await cartaoAtual(a.cartaoId, (x) => x.totalCasas === 0)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)
    const marcada = (await casasDe(a.cartaoId, a.quadraId, (l) => !!l[0]?.naoVisitar))[0]
    await marcarCasa({ ...base, casa: marcada, marca: 'naoVisitar', ligada: false })
    await cartaoAtual(a.cartaoId, (x) => x.totalCasas === 1)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)
    await marcarCasa({ ...base, casa: { ...marcada, naoVisitar: undefined }, marca: 'estudo', ligada: true })
    await casasDe(a.cartaoId, a.quadraId, (l) => l.find((x) => x.id === id)?.estudo === true)
    expect(semContadores(await camposDaQuadra(a.cartaoId, a.quadraId))).toBe(true)
  })
})
