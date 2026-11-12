// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase/app'
import { abrirCartaoManual, criarCartao, observarCartao } from '@/firebase/cards'
import { criarQuadra, observarQuadras } from '@/firebase/blocks'
import { atualizarDadosDoCartao } from '@/firebase/migracao'
import { vencimentoDoRegistro } from '@/domain/historico'
import type { Cartao, Quadra } from '@/domain/types'

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
const quadraAtual = (cartao: string, id: string, pronto: (q: Quadra) => boolean = () => true) =>
  proximo<Quadra[]>((cb) => observarQuadras(cartao, cb), (l) => l.some((q) => q.id === id && pronto(q))).then((l) => l.find((q) => q.id === id) as Quadra)

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


const EM = new Date('2026-03-10T12:00:00Z').getTime()
type Docs = Record<string, Record<string, unknown>>

async function cenario() {
  const cartaoId = await criarCartao({ numero: '1', titulo: 'Cartão' }, admin)
  await abrirCartaoManual(await cartaoAtual(cartaoId), admin, [])
  const quadraId = await criarQuadra(cartaoId, { rotulo: 'Q1', ruas: ['Rua A'] })
  const base = `cards/${cartaoId}/blocks/${quadraId}/houses`
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore()
    const casa = (n: number, status: string, extra = {}) => setDoc(doc(f, `${base}/h${n}`), { rua: 'Rua A', numero: String(n), ordem: n, status, criadoEm: new Date(1), ...extra })
    await casa(1, 'estudo')
    await casa(2, 'nao_visitar')
    await casa(3, 'falado')
    await casa(4, 'sem_resposta')
    await setDoc(doc(f, `${base}/h3/visits/v1`), { status: 'falado', em: new Date(EM), porUid: 'u', porNome: 'Ana', ciclo: 1 })
    await setDoc(doc(f, `${base}/h3/visits/v2`), { status: 'estudo', em: new Date(EM), expiraEm: new Date(EM + 5), porUid: 'u', porNome: 'Ana', ciclo: 1 })
  })
  return { cartaoId, quadraId, base }
}

/** Tudo que está gravado no cartão (sem atualizadoEm, que muda a cada recálculo). */
async function fotografia(c: { cartaoId: string; base: string }): Promise<Docs> {
  const out: Docs = {}
  const cartao = (await getDoc(doc(db, `cards/${c.cartaoId}`))).data() ?? {}
  delete cartao.atualizadoEm
  out.cartao = cartao
  for (const n of [1, 2, 3, 4]) {
    out[`h${n}`] = (await getDoc(doc(db, `${c.base}/h${n}`))).data() ?? {}
    for (const d of (await getDocs(collection(db, `${c.base}/h${n}/visits`))).docs) out[`h${n}/${d.id}`] = d.data()
  }
  return out
}

describe('atualizarDadosDoCartao', () => {
  it('troca status antigos por marcas, dá vencimento às visitas e recalcula as contas', async () => {
    const c = await cenario()
    const r = await atualizarDadosDoCartao(c.cartaoId, { nome: 'Admin' })
    expect(r).toEqual({ casas: 2, visitas: 1 })
    const f = await fotografia(c)
    expect(f.h1).toMatchObject({ status: 'pendente', estudo: true, estudoPor: 'Admin' })
    expect(f.h1.estudoEm).toBeInstanceOf(Timestamp)
    expect(f.h2).toMatchObject({ status: 'pendente', naoVisitar: true, naoVisitarPor: 'Admin' })
    expect(f.h2.naoVisitarEm).toBeInstanceOf(Timestamp)
    expect(f.h3.status).toBe('falado')
    expect(f.h4.status).toBe('sem_resposta')
    expect((f['h3/v1'].expiraEm as Timestamp).toMillis()).toBe(vencimentoDoRegistro(EM))
    expect((f['h3/v2'].expiraEm as Timestamp).toMillis()).toBe(EM + 5)
    expect(await cartaoAtual(c.cartaoId, (x) => x.totalCasas === 3)).toMatchObject({ totalCasas: 3, resolvidas: 1 })
    expect(await quadraAtual(c.cartaoId, c.quadraId, (q) => q.totalCasas === 3)).toMatchObject({ totalCasas: 3, faltam: 2 })
  })

  it('rodar de novo não muda nada', async () => {
    const c = await cenario()
    await atualizarDadosDoCartao(c.cartaoId, { nome: 'Admin' })
    const antes = await fotografia(c)
    const quadraAntes = await quadraAtual(c.cartaoId, c.quadraId)
    expect(await atualizarDadosDoCartao(c.cartaoId, { nome: 'Outro' })).toEqual({ casas: 0, visitas: 0 })
    expect(await fotografia(c)).toEqual(antes)
    expect(await quadraAtual(c.cartaoId, c.quadraId)).toEqual(quadraAntes)
  })
})
