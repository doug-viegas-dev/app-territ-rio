// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/app'
import { abrirCartaoManual, criarCartao, observarCartao, observarEventos } from '@/firebase/cards'
import { criarQuadra, observarQuadras } from '@/firebase/blocks'
import { abrirRodada, encerrarRodada, observarRodadas } from '@/firebase/rodadas'
import type { Cartao, EventoCartao, Quadra, Rodada } from '@/domain/types'

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
const cartaoAtual = (id: string) =>
  proximo<Cartao | null>((cb) => observarCartao(id, cb), (c) => c !== null).then((c) => c as Cartao)
const quadraAtual = (cartao: string, id: string, pronto: (q: Quadra) => boolean = () => true) =>
  proximo<Quadra[]>((cb) => observarQuadras(cartao, cb), (l) => l.some((q) => q.id === id && pronto(q))).then((l) => l.find((q) => q.id === id) as Quadra)
const rodadasDe = (cartao: string, quadra: string, pronto: (l: Rodada[]) => boolean = () => true) =>
  proximo<Rodada[]>((cb) => observarRodadas(cartao, quadra, cb), pronto)

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
  admin.uid = auth.currentUser?.uid ?? ''
}, 30000)
afterAll(async () => { if (env) await env.cleanup() })

let seq = 0
async function cenario() {
  const cartaoId = await criarCartao({ numero: String(++seq), titulo: `Cartão ${seq}` }, admin)
  await abrirCartaoManual(await cartaoAtual(cartaoId), admin)
  const quadraId = await criarQuadra(cartaoId, { rotulo: 'Q1', ruas: ['Rua A', 'Rua B'] })
  return { cartaoId, quadraId }
}

describe('rodadas', () => {
  it('abrirRodada cria a rodada 1 com quem e quando', async () => {
    const c = await cenario()
    const antes = Date.now()
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId), admin)
    const q = await quadraAtual(c.cartaoId, c.quadraId, (x) => !!x.rodadaAtual)
    expect(q.rodadasTotal).toBe(1)
    expect(q.rodadaAtual).toMatchObject({ numero: 1, porNome: 'Admin' })
    expect(q.rodadaAtual?.em).toBeGreaterThanOrEqual(antes - 2000)
    const [r] = await rodadasDe(c.cartaoId, c.quadraId, (l) => l.length === 1)
    expect(r).toMatchObject({ id: q.rodadaAtual?.id, numero: 1, abertaPorUid: admin.uid, abertaPorNome: 'Admin' })
    expect(r.abertaEm).toBeGreaterThanOrEqual(antes - 2000)
    expect(r.encerradaEm).toBeUndefined()
  })

  it('abrirRodada na quadra com rodada aberta lança erro', async () => {
    const c = await cenario()
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId), admin)
    const aberta = await quadraAtual(c.cartaoId, c.quadraId, (x) => !!x.rodadaAtual)
    await expect(abrirRodada(c.cartaoId, aberta, admin)).rejects.toThrow()
    expect((await rodadasDe(c.cartaoId, c.quadraId)).length).toBe(1)
    expect((await quadraAtual(c.cartaoId, c.quadraId)).rodadasTotal).toBe(1)
  })

  it('encerrarRodada grava quem e quando e limpa rodadaAtual', async () => {
    const c = await cenario()
    const nova = await quadraAtual(c.cartaoId, c.quadraId)
    await expect(encerrarRodada(c.cartaoId, nova, admin)).rejects.toThrow()
    await abrirRodada(c.cartaoId, nova, admin)
    const aberta = await quadraAtual(c.cartaoId, c.quadraId, (x) => !!x.rodadaAtual)
    const antes = Date.now()
    await encerrarRodada(c.cartaoId, aberta, admin)
    const q = await quadraAtual(c.cartaoId, c.quadraId, (x) => !x.rodadaAtual)
    expect(q.rodadaAtual).toBeUndefined()
    expect(q.rodadasTotal).toBe(1)
    const [r] = await rodadasDe(c.cartaoId, c.quadraId, (l) => l.length === 1 && l[0].encerradaEm !== undefined)
    expect(r).toMatchObject({ numero: 1, encerradaPorUid: admin.uid, encerradaPorNome: 'Admin' })
    expect(r.encerradaEm).toBeGreaterThanOrEqual(antes - 2000)
  })

  it('a rodada seguinte é a 2', async () => {
    const c = await cenario()
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId), admin)
    await encerrarRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId, (x) => !!x.rodadaAtual), admin)
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId, (x) => !x.rodadaAtual), admin)
    const q = await quadraAtual(c.cartaoId, c.quadraId, (x) => x.rodadaAtual?.numero === 2)
    expect(q.rodadasTotal).toBe(2)
    const l = await rodadasDe(c.cartaoId, c.quadraId, (x) => x.length === 2)
    expect(l.map((r) => r.numero)).toEqual([2, 1])
  })

  it('abrir e encerrar gravam eventos com quadra e número', async () => {
    const c = await cenario()
    await abrirRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId), admin)
    await encerrarRodada(c.cartaoId, await quadraAtual(c.cartaoId, c.quadraId, (x) => !!x.rodadaAtual), admin)
    const ev = await proximo<EventoCartao[]>((cb) => observarEventos(c.cartaoId, cb), (l) => l.filter((e) => e.tipo === 'rodada').length === 2)
    const rodadas = ev.filter((e) => e.tipo === 'rodada')
    expect(rodadas.map((e) => e.motivo).sort()).toEqual(['rodada_aberta', 'rodada_encerrada'])
    for (const e of rodadas) expect(e).toMatchObject({ quadraId: c.quadraId, quadraRotulo: 'Q1', rodada: 1, porUid: admin.uid, porNome: 'Admin' })
  })

  it('observarEventos respeita o limite informado', async () => {
    const c = await cenario()
    const lista = await proximo<EventoCartao[]>((cb) => observarEventos(c.cartaoId, cb, 1))
    expect(lista).toHaveLength(1)
  })
})
