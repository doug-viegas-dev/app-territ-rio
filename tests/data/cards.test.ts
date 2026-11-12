// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/app'
import { abrirCartaoManual, atualizarCartao, criarCartao, fecharCartaoManual, observarCartao, observarCartoes, observarEventos } from '@/firebase/cards'
import { adicionarRua, atualizarQuadra, criarQuadra, observarQuadras } from '@/firebase/blocks'
import { abrirRodada, encerrarRodada } from '@/firebase/rodadas'
import type { Cartao, EventoCartao, Quadra } from '@/domain/types'

vi.hoisted(() => {
  Object.assign(import.meta.env, { VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_PROJECT_ID: 'demo-meu-territorio' })
})

const hostPort =(valor: string | undefined, padrao: string): [string, number] => {
  const [host, porta] = (valor ?? padrao).split(':')
  return [host, Number(porta)]
}
const [firestoreHost, firestorePort] = hostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
const [authHost, authPort] = hostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
const admin = { uid: 'admin-uid', nome: 'Admin' }
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
const cartaoAtual = (id: string) => proximo<Cartao | null>((cb) => observarCartao(id, cb), (c) => c !== null).then((c) => c as Cartao)
const eventos = (id: string) => proximo<EventoCartao[]>((cb) => observarEventos(id, cb))

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
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: admin.uid, email: 'admin@example.com', email_verified: true })))
}, 30000)
afterAll(async () => { if (env) await env.cleanup() })

describe('cartões', () => {
  it('cria cartão fechado, ciclo 1, contadores zerados e evento de criação', async () => {
    const id = await criarCartao({ numero: '1', titulo: 'Centro', mapsUrl: 'https://maps.example/1' }, admin)
    const c = await cartaoAtual(id)
    expect(c).toMatchObject({ numero: '1', titulo: 'Centro', mapsUrl: 'https://maps.example/1', estado: 'fechado', ciclo: 1, totalCasas: 0, resolvidas: 0 })
    const e = await eventos(id)
    expect(e).toHaveLength(1)
    expect(e[0]).toMatchObject({ tipo: 'fechado', motivo: 'criacao', porUid: admin.uid, porNome: admin.nome })
  })

  it('observarCartoes entrega abertos antes de fechados, por número', async () => {
    const a = await criarCartao({ numero: '20', titulo: 'A' }, admin)
    const b = await criarCartao({ numero: '10', titulo: 'B' }, admin)
    const c = await criarCartao({ numero: '15', titulo: 'C' }, admin)
    await abrirCartaoManual(await cartaoAtual(a), admin, [])
    await abrirCartaoManual(await cartaoAtual(c), admin, [])
    const lista = await proximo<Cartao[]>(observarCartoes, (l) => [a, b, c].every((id) => l.some((x) => x.id === id)))
    const ids = lista.filter((x) => [a, b, c].includes(x.id)).map((x) => x.id)
    expect(ids).toEqual([c, a, b])
    const abertos = lista.filter((x) => x.estado === 'aberto').length
    expect(lista.slice(0, abertos).every((x) => x.estado === 'aberto')).toBe(true)
  })

  it('abre sem mudar o ciclo e grava quem abriu', async () => {
    const id = await criarCartao({ numero: '2', titulo: 'Abrir' }, admin)
    await abrirCartaoManual(await cartaoAtual(id), admin, [])
    const c = await cartaoAtual(id)
    expect(c).toMatchObject({ estado: 'aberto', ciclo: 1, abertoPorNome: 'Admin' })
    expect(typeof c.abertoEm).toBe('number')
    const e = await eventos(id)
    expect(e[0]).toMatchObject({ tipo: 'aberto', motivo: 'abertura', porNome: 'Admin' })
  })

  it('fecharCartaoManual não sobe o ciclo e grava o evento', async () => {
    const id = await criarCartao({ numero: '3', titulo: 'Fechar' }, admin)
    await abrirCartaoManual(await cartaoAtual(id), admin, [])
    await espera()
    await fecharCartaoManual(await cartaoAtual(id), admin, [])
    const c = await cartaoAtual(id)
    expect(c).toMatchObject({ estado: 'fechado', ciclo: 1 })
    expect((await eventos(id))[0]).toMatchObject({ tipo: 'fechado', motivo: 'fechamento_manual' })
  })

  it('fecharCartaoManual lança erro com rodada aberta e não grava nada', async () => {
    const id = await criarCartao({ numero: '3b', titulo: 'Rodada aberta' }, admin)
    await abrirCartaoManual(await cartaoAtual(id), admin, [])
    const aberta = { rodadaAtual: { id: 'r1', numero: 1, porNome: 'Ana', em: 1 } }
    await expect(fecharCartaoManual(await cartaoAtual(id), admin, [aberta])).rejects.toThrow('Rodada aberta')
    expect((await cartaoAtual(id)).estado).toBe('aberto')
  })

  it('abrir o cartão zera as voltas de todas as quadras', async () => {
    const id = await criarCartao({ numero: '7', titulo: 'Voltas' }, admin)
    await abrirCartaoManual(await cartaoAtual(id), admin, [])
    const q1 = await criarQuadra(id, { rotulo: 'Q1', ruas: ['Rua A'] })
    const q2 = await criarQuadra(id, { rotulo: 'Q2', ruas: ['Rua B'] })
    const real = { uid: auth.currentUser?.uid ?? '', nome: 'Admin' } // as regras exigem o uid do Auth nas rodadas
    const quadraDe = (qid: string, pronto: (q: Quadra) => boolean = () => true) =>
      proximo<Quadra[]>((cb) => observarQuadras(id, cb), (l) => l.some((q) => q.id === qid && pronto(q))).then((l) => l.find((q) => q.id === qid) as Quadra)
    for (let i = 0; i < 3; i++) {
      await abrirRodada(id, await quadraDe(q1, (q) => !q.rodadaAtual), real)
      await encerrarRodada(id, await quadraDe(q1, (q) => !!q.rodadaAtual), real)
      await quadraDe(q1, (q) => !q.rodadaAtual && q.rodadasTotal === i + 1)
    }
    for (let i = 0; i < 5; i++) {
      await abrirRodada(id, await quadraDe(q2, (q) => !q.rodadaAtual), real)
      await encerrarRodada(id, await quadraDe(q2, (q) => !!q.rodadaAtual), real)
      await quadraDe(q2, (q) => !q.rodadaAtual && q.rodadasTotal === i + 1)
    }
    await abrirRodada(id, await quadraDe(q2, (q) => !q.rodadaAtual && q.rodadasTotal === 5), real)
    const antes = await quadraDe(q2, (q) => !!q.rodadaAtual)
    expect(antes.rodadasTotal).toBe(6)
    await abrirCartaoManual(await cartaoAtual(id), admin, [{ id: q1 }, { id: q2 }])
    const a = await quadraDe(q1, (q) => q.rodadasTotal === 0)
    const b = await quadraDe(q2, (q) => q.rodadasTotal === 0 && !q.rodadaAtual)
    expect(a.rodadaAtual).toBeUndefined()
    expect(b.rodadaAtual).toBeUndefined()
    expect((await cartaoAtual(id)).estado).toBe('aberto')
    expect((await eventos(id))[0]).toMatchObject({ tipo: 'aberto', motivo: 'abertura' })
    await abrirRodada(id, a, real)
    expect((await quadraDe(q1, (q) => !!q.rodadaAtual)).rodadaAtual).toMatchObject({ numero: 1 })
  })

  it('atualiza campos editáveis', async () => {
    const id = await criarCartao({ numero: '4', titulo: 'Antes' }, admin)
    await atualizarCartao(id, { titulo: 'Depois', imagemPath: 'cards/x/mapa.webp' })
    expect(await cartaoAtual(id)).toMatchObject({ titulo: 'Depois', imagemPath: 'cards/x/mapa.webp' })
  })

  it('devolve no máximo 10 eventos, do mais novo para o mais antigo', async () => {
    const id = await criarCartao({ numero: '5', titulo: 'Muitos' }, admin)
    for (let i = 0; i < 5; i++) {
      await espera()
      await abrirCartaoManual(await cartaoAtual(id), admin, [])
      await espera()
      await fecharCartaoManual(await cartaoAtual(id), admin, [])
    }
    await espera()
    await abrirCartaoManual(await cartaoAtual(id), admin, [])
    const e = await proximo<EventoCartao[]>((cb) => observarEventos(id, cb, 10))
    expect(e).toHaveLength(10)
    expect(e[0].motivo).toBe('abertura')
    for (let i = 1; i < e.length; i++) expect(e[i - 1].em).toBeGreaterThanOrEqual(e[i].em)
  })
})

describe('quadras e ruas', () => {
  it('cria quadra com ruas e observa', async () => {
    const cartao = await criarCartao({ numero: '6', titulo: 'Quadras' }, admin)
    const id = await criarQuadra(cartao, { rotulo: 'Quadra 1', ruas: ['Rua A', 'Rua B'] })
    const q = await proximo((cb) => observarQuadras(cartao, cb), (l) => l.length > 0)
    expect(q).toEqual([{ id, rotulo: 'Quadra 1', ruas: ['Rua A', 'Rua B'], ordem: expect.any(Number), totalCasas: 0, faltam: 0, rodadasTotal: 0 }])
  })

  it('atualiza quadra', async () => {
    const cartao = await criarCartao({ numero: '7', titulo: 'Atualizar' }, admin)
    const id = await criarQuadra(cartao, { rotulo: 'Q', ruas: ['Rua A'] })
    await atualizarQuadra(cartao, id, { rotulo: 'Q2', ordem: 99 })
    const q = await proximo((cb) => observarQuadras(cartao, cb), (l) => l[0]?.rotulo === 'Q2')
    expect(q[0]).toMatchObject({ rotulo: 'Q2', ordem: 99 })
  })

  it('adicionarRua acrescenta, ignora vazia e repetida e não remove', async () => {
    const cartao = await criarCartao({ numero: '8', titulo: 'Ruas' }, admin)
    const id = await criarQuadra(cartao, { rotulo: 'Q', ruas: ['Rua das Acácias'] })
    await adicionarRua(cartao, id, '  Rua Nova  ')
    await adicionarRua(cartao, id, '   ')
    await adicionarRua(cartao, id, 'rua das acácias')
    await adicionarRua(cartao, id, 'rua nova')
    const q = await proximo((cb) => observarQuadras(cartao, cb), (l) => (l[0]?.ruas.length ?? 0) >= 2)
    expect(q[0].ruas).toEqual(['Rua das Acácias', 'Rua Nova'])
  })
})
