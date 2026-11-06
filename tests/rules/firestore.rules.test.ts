import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment
const projectId = 'demo-meu-territorio'
const card = { numero: '1', titulo: 'CartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o 1', estado: 'aberto', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 1 }
const member = (papel = 'publicador', ativo = true) => ({ nome: papel, papel, ativo })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: Number((process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':').at(-1)) },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: Number((process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':').at(-1)) },
  })
})
afterAll(async () => { if (env) await env.cleanup() })
beforeEach(async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'members', 'admin@example.com'), member('admin'))
    await setDoc(doc(db, 'members', 'publisher@example.com'), member())
    await setDoc(doc(db, 'members', 'inactive@example.com'), member('publicador', false))
    await setDoc(doc(db, 'cards', 'c1'), card)
    await setDoc(doc(db, 'cards', 'c1', 'blocks', 'b1'), { rotulo: 'Quadra 1', ruas: ['Rua A'], ordem: 1 })
    await setDoc(doc(db, 'cards', 'c1', 'blocks', 'b1', 'houses', 'h1'), { rua: 'Rua A', status: 'pendente', ordem: 1 })
    await setDoc(doc(db, 'cards', 'c1', 'blocks', 'b1', 'visits', 'v1'), { status: 'falado', porUid: 'publisher', porNome: 'Publicador', ciclo: 1 })
  })
})

const user = (email: string, uid: string) => env.authenticatedContext(uid, { email, email_verified: true }).firestore()
const adminDb = () => user('admin@example.com', 'admin')
const publisherDb = () => user('publisher@example.com', 'publisher')

describe('regras Firestore', () => {
  it('nega acesso anÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´nimo, sem membro ou membro inativo', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'cards/c1')))
    await assertFails(getDoc(doc(user('missing@example.com', 'missing'), 'cards/c1')))
    const inactive = user('inactive@example.com', 'inactive')
    await assertFails(getDoc(doc(inactive, 'cards/c1')))
    await assertFails(setDoc(doc(inactive, 'cards/c2'), card))
  })

  it('permite ao publicador ler cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o, criar casa e visita mesmo fechado, e atualizar contador', async () => {
    const db = publisherDb()
    await assertSucceeds(getDoc(doc(db, 'cards/c1')))
    await assertSucceeds(setDoc(doc(db, 'cards/c1/blocks/b1/houses/h2'), { rua: 'Rua A', status: 'pendente', ordem: 2 }))
    await assertSucceeds(setDoc(doc(db, 'cards/c1/blocks/b1/houses/h1/visits/v2'), { status: 'falado', porUid: 'publisher', porNome: 'Publicador', ciclo: 1 }))
    await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { resolvidas: 1 }))
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), 'cards/c1'), { estado: 'fechado' }))
    await assertSucceeds(setDoc(doc(db, 'cards/c1/blocks/b1/houses/h3'), { rua: 'Rua A', status: 'pendente', ordem: 3 }))
    await assertSucceeds(setDoc(doc(db, 'cards/c1/blocks/b1/houses/h1/visits/v3'), { status: 'falado', porUid: 'publisher', porNome: 'Publicador', ciclo: 1 }))
  })

  it('limita o publicador a contadores e fechamento, e impede alteraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes administrativas', async () => {
    const db = publisherDb()
    await assertFails(updateDoc(doc(db, 'cards/c1'), { titulo: 'Alterado' }))
    await assertFails(setDoc(doc(db, 'cards/c2'), card))
    await assertFails(setDoc(doc(db, 'members', 'new@example.com'), member()))
    await assertFails(deleteDoc(doc(db, 'cards/c1/blocks/b1/houses/h1')))
    await assertFails(updateDoc(doc(db, 'cards/c1/blocks/b1/houses/h1/visits/v1'), { status: 'estudo' }))
    await assertFails(setDoc(doc(db, 'cards/c1/blocks/b1/houses/h1/visits/vx'), { status: 'falado', porUid: 'someone-else', ciclo: 1 }))
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), 'cards/c1'), { estado: 'fechado' }))
    await assertFails(updateDoc(doc(db, 'cards/c1'), { estado: 'aberto' }))
    await assertFails(updateDoc(doc(db, 'cards/c1'), { estado: 'fechado', titulo: 'Alterado' }))

    const batch = writeBatch(db)
    batch.update(doc(db, 'cards/c1'), { estado: 'fechado', ciclo: 2 })
    batch.set(doc(db, 'cards/c1/eventos/e1'), { tipo: 'fechado', motivo: 'fechamento_automatico', porUid: 'publisher', porNome: 'Publicador', em: 2 })
    await assertSucceeds(batch.commit())
  })

  it('permite apenas acrescentar ruas e mantÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©m rotulo e ordem protegidos', async () => {
    const db = publisherDb()
    const block = doc(db, 'cards/c1/blocks/b1')
    await assertSucceeds(updateDoc(block, { ruas: ['Rua A', 'Rua B'] }))
    await assertFails(updateDoc(block, { ruas: ['Rua B'] }))
    await assertFails(updateDoc(block, { rotulo: 'Outra' }))
    await assertFails(updateDoc(block, { ordem: 2 }))
  })

  it('restringe eventos: publicador sÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ cria fechamento prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³prio; leitura ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© apenas admin', async () => {
    const publisher = publisherDb()
    const events = collection(publisher, 'cards/c1/eventos')
    await assertFails(getDocs(events))
    await assertSucceeds(setDoc(doc(events, 'auto'), { tipo: 'fechado', motivo: 'fechamento_automatico', porUid: 'publisher', porNome: 'Publicador', em: 3 }))
    await assertFails(setDoc(doc(events, 'fake'), { tipo: 'aberto', motivo: 'abertura', porUid: 'publisher', porNome: 'Publicador', em: 3 }))
    await assertFails(setDoc(doc(events, 'other'), { tipo: 'fechado', motivo: 'fechamento_automatico', porUid: 'other', porNome: 'Outra pessoa', em: 3 }))
    await assertFails(updateDoc(doc(events, 'auto'), { porNome: 'Alterado' }))
    await assertFails(deleteDoc(doc(events, 'auto')))

    const admin = adminDb()
    await assertSucceeds(getDocs(collection(admin, 'cards/c1/eventos')))
    await assertSucceeds(setDoc(doc(admin, 'cards/c1/eventos/manual'), { tipo: 'aberto', motivo: 'abertura', porUid: 'admin', porNome: 'admin', em: 4 }))
    await assertFails(updateDoc(doc(admin, 'cards/c1/eventos/manual'), { porNome: 'Alterado' }))
    await assertFails(deleteDoc(doc(admin, 'cards/c1/eventos/manual')))
  })

  it('permite ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  administraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o gerir membros e cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes e remover casas', async () => {
    const db = adminDb()
    await assertSucceeds(getDoc(doc(db, 'members/admin@example.com')))
    await assertSucceeds(setDoc(doc(db, 'members/new@example.com'), member()))
    await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { titulo: 'Novo tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­tulo' }))
    await assertSucceeds(setDoc(doc(db, 'cards/c2'), card))
    await assertSucceeds(deleteDoc(doc(db, 'cards/c1/blocks/b1/houses/h1')))
  })

  it('só a administração lista todos os membros; o publicador lê apenas o próprio documento', async () => {
    await assertSucceeds(getDocs(collection(adminDb(), 'members')))
    await assertSucceeds(getDoc(doc(publisherDb(), 'members/publisher@example.com')))
    await assertFails(getDoc(doc(publisherDb(), 'members/admin@example.com')))
    await assertFails(getDocs(collection(publisherDb(), 'members')))
  })
})