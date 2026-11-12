// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase/app'
import { abrirCartaoManual, criarCartao, observarCartao } from '@/firebase/cards'
import { criarQuadra, excluirQuadra, observarQuadras, quadraTemCasas, removerRua, renomearRua, RenomeacaoIncompleta, trocarOrdemDeQuadras } from '@/firebase/blocks'
import { abrirRodada } from '@/firebase/rodadas'
import { criarCasa, marcarCasa, observarCasas } from '@/firebase/houses'
import type { Cartao, Casa, Quadra } from '@/domain/types'

vi.hoisted(() => {
  Object.assign(import.meta.env, { VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_PROJECT_ID: 'demo-meu-territorio' })
})

// Permite falhar o commit de um lote específico (contagem a partir de 1) sem mudar o resto.
const falha = vi.hoisted(() => ({ commitNumero: 0, vistos: 0 }))
vi.mock('firebase/firestore', async (original) => {
  const real = await original<typeof import('firebase/firestore')>()
  return {
    ...real,
    writeBatch: (...args: Parameters<typeof real.writeBatch>) => {
      const lote = real.writeBatch(...args)
      const commit = lote.commit.bind(lote)
      lote.commit = async () => {
        if (falha.commitNumero) {
          falha.vistos += 1
          if (falha.vistos === falha.commitNumero) throw new Error('falha injetada')
        }
        return commit()
      }
      return lote
    },
  }
})

const hostPort = (valor: string | undefined, padrao: string): [string, number] => {
  const [host, porta] = (valor ?? padrao).split(':')
  return [host, Number(porta)]
}
const [firestoreHost, firestorePort] = hostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
const [authHost, authPort] = hostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
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
const quadras = (cartao: string, pronto?: (q: Quadra[]) => boolean) => proximo<Quadra[]>((cb) => observarQuadras(cartao, cb), pronto)
const casasDe = (cartao: string, quadra: string, pronto?: (c: Casa[]) => boolean) => proximo<Casa[]>((cb) => observarCasas(cartao, quadra, (c) => cb(c)), pronto)
const cartaoAtual = (id: string) => proximo<Cartao | null>((cb) => observarCartao(id, cb), (c) => c !== null).then((c) => c as Cartao)

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
const existe = async (path: string) => (await getDoc(doc(db, path))).exists()
const novaQuadra = async (ruas: string[] = ['Rua A']) => {
  const cartao = await criarCartao({ numero: `b${++seq}`, titulo: 'T' }, admin)
  const quadra = await criarQuadra(cartao, { rotulo: 'Q1', ruas })
  return { cartao, quadra }
}
const semear = async (cartao: string, quadra: string, ruas: string[]) => {
  for (let i = 0; i < ruas.length; i += 400) {
    const lote = writeBatch(db)
    ruas.slice(i, i + 400).forEach((rua, j) => lote.set(doc(collection(db, 'cards', cartao, 'blocks', quadra, 'houses')), { rua, numero: String(i + j), ordem: i + j, status: 'pendente', criadoEm: new Date() }))
    await lote.commit()
  }
}

describe('excluir quadra', () => {
  it('quadra vazia some', async () => {
    const { cartao, quadra } = await novaQuadra()
    expect(await quadraTemCasas(cartao, quadra)).toBe(false)
    await excluirQuadra(cartao, quadra)
    expect(await existe(`cards/${cartao}/blocks/${quadra}`)).toBe(false)
  })
  it('com casa comum rejeita com casas e nada é apagado', async () => {
    const { cartao, quadra } = await novaQuadra()
    await criarCasa(cartao, quadra, { rua: 'Rua A', numero: '1' }, [])
    expect(await quadraTemCasas(cartao, quadra)).toBe(true)
    await expect(excluirQuadra(cartao, quadra)).rejects.toMatchObject({ motivo: 'casas' })
    expect(await existe(`cards/${cartao}/blocks/${quadra}`)).toBe(true)
    expect((await getDocs(collection(db, 'cards', cartao, 'blocks', quadra, 'houses'))).size).toBe(1)
  })
  it('com casa "não visitar" também rejeita', async () => {
    const { cartao, quadra } = await novaQuadra()
    const id = await criarCasa(cartao, quadra, { rua: 'Rua A', numero: '1' }, [])
    const casa = (await casasDe(cartao, quadra, (l) => l.some((c) => c.id === id))).find((c) => c.id === id) as Casa
    await marcarCasa({ cartaoId: cartao, quadraId: quadra, casa, marca: 'naoVisitar', ligada: true, usuario: admin })
    await expect(excluirQuadra(cartao, quadra)).rejects.toMatchObject({ motivo: 'casas' })
    expect(await existe(`cards/${cartao}/blocks/${quadra}`)).toBe(true)
  })
  it('com volta aberta rejeita com volta', async () => {
    const { cartao, quadra } = await novaQuadra()
    await abrirCartaoManual(await cartaoAtual(cartao), admin, [])
    const [q] = await quadras(cartao)
    await abrirRodada(cartao, q, admin)
    await expect(excluirQuadra(cartao, quadra)).rejects.toMatchObject({ motivo: 'volta' })
    expect(await existe(`cards/${cartao}/blocks/${quadra}`)).toBe(true)
  })
})

describe('trocar ordem de quadras', () => {
  it('troca as duas e deixa a terceira intacta', async () => {
    const cartao = await criarCartao({ numero: 'o1', titulo: 'Ordem' }, admin)
    const a = await criarQuadra(cartao, { rotulo: 'A', ruas: [] })
    const b = await criarQuadra(cartao, { rotulo: 'B', ruas: [] })
    const c = await criarQuadra(cartao, { rotulo: 'C', ruas: [] })
    const antes = await quadras(cartao, (l) => l.length === 3)
    const o = (id: string) => (antes.find((q) => q.id === id) as Quadra).ordem
    await trocarOrdemDeQuadras(cartao, [{ id: a, ordem: o(b) }, { id: b, ordem: o(a) }])
    const depois = await quadras(cartao, (l) => l.length === 3 && l[0].id === b)
    expect(depois.map((q) => q.id)).toEqual([b, a, c])
    expect(depois.find((q) => q.id === c)?.ordem).toBe(o(c))
  })
})

describe('renomear rua', () => {
  it('muda só as casas da rua e troca o nome na lista', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A', 'Rua B'])
    await semear(cartao, quadra, ['Rua A', 'Rua A', 'Rua A', 'Rua B'])
    expect(await renomearRua(cartao, quadra, 'Rua A', 'Rua C')).toEqual({ casas: 3 })
    const casas = await casasDe(cartao, quadra, (l) => l.length === 4 && l.filter((c) => c.rua === 'Rua C').length === 3)
    expect(casas.filter((c) => c.rua === 'Rua B')).toHaveLength(1)
    const [q] = await quadras(cartao)
    expect(q.ruas).toEqual(['Rua C', 'Rua B'])
  })
  it('trocar só a caixa funciona', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A'])
    await semear(cartao, quadra, ['Rua A'])
    await renomearRua(cartao, quadra, 'Rua A', 'rua a')
    expect((await casasDe(cartao, quadra, (l) => l[0]?.rua === 'rua a'))[0].rua).toBe('rua a')
    expect((await quadras(cartao, (l) => l[0].ruas[0] === 'rua a'))[0].ruas).toEqual(['rua a'])
  })
  it('rua que só existe nas casas entra na lista com o novo nome', async () => {
    const { cartao, quadra } = await novaQuadra([])
    await semear(cartao, quadra, ['Rua X'])
    await renomearRua(cartao, quadra, 'Rua X', 'Rua Y')
    expect((await quadras(cartao, (l) => l[0].ruas.length > 0))[0].ruas).toEqual(['Rua Y'])
  })
  it('mais de 400 casas: atualiza todas', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A'])
    await semear(cartao, quadra, Array.from({ length: 401 }, () => 'Rua A'))
    expect(await renomearRua(cartao, quadra, 'Rua A', 'Rua C')).toEqual({ casas: 401 })
    const casas = await casasDe(cartao, quadra, (l) => l.length === 401 && l.every((c) => c.rua === 'Rua C'))
    expect(casas.every((c) => c.rua === 'Rua C')).toBe(true)
  }, 30000)
  it('falha no 2º lote lança RenomeacaoIncompleta; repetir só toca as que faltam', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A'])
    await semear(cartao, quadra, Array.from({ length: 401 }, () => 'Rua A'))
    falha.commitNumero = 2
    falha.vistos = 0
    try {
      await expect(renomearRua(cartao, quadra, 'Rua A', 'Rua C')).rejects.toBeInstanceOf(RenomeacaoIncompleta)
    } finally {
      falha.commitNumero = 0
    }
    expect((await quadras(cartao))[0].ruas).toEqual(['Rua A'])
    expect(await renomearRua(cartao, quadra, 'Rua A', 'Rua C')).toEqual({ casas: 1 })
    const casas = await casasDe(cartao, quadra, (l) => l.length === 401 && l.every((c) => c.rua === 'Rua C'))
    expect(casas.every((c) => c.rua === 'Rua C')).toBe(true)
    expect((await quadras(cartao, (l) => l[0].ruas[0] === 'Rua C'))[0].ruas).toEqual(['Rua C'])
  }, 30000)
  it('falha no 1º lote relança o erro original', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A'])
    await semear(cartao, quadra, ['Rua A'])
    falha.commitNumero = 1
    falha.vistos = 0
    try {
      await expect(renomearRua(cartao, quadra, 'Rua A', 'Rua C')).rejects.toThrow('falha injetada')
    } finally {
      falha.commitNumero = 0
    }
  })
})

describe('remover rua', () => {
  it('sem casas remove da lista', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A', 'Rua B'])
    await removerRua(cartao, quadra, 'Rua A')
    expect((await quadras(cartao, (l) => l[0].ruas.length === 1))[0].ruas).toEqual(['Rua B'])
  })
  it('com casa rejeita com casas e a lista fica igual', async () => {
    const { cartao, quadra } = await novaQuadra(['Rua A', 'Rua B'])
    await semear(cartao, quadra, ['Rua A'])
    await expect(removerRua(cartao, quadra, 'Rua A')).rejects.toMatchObject({ motivo: 'casas' })
    expect((await quadras(cartao))[0].ruas).toEqual(['Rua A', 'Rua B'])
  })
})
