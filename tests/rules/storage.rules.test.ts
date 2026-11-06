// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { deleteObject, listAll, ref, uploadBytes } from 'firebase/storage'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meu-territorio',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: Number((process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':').at(-1)) },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: Number((process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':').at(-1)) },
  })
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'members/publisher@example.com'), { nome: 'Publicador', papel: 'publicador', ativo: true })
    await setDoc(doc(context.firestore(), 'members/admin@example.com'), { nome: 'Admin', papel: 'admin', ativo: true })
  })
}, 30000)
afterAll(async () => { if (env) await env.cleanup() })
const storageFor = (email: string, uid: string) => env.authenticatedContext(uid, { email, email_verified: true }).storage('gs://demo-meu-territorio.appspot.com')

describe('regras Storage', () => {
  it('permite leitura a membro ativo, mas escrita apenas a admin', async () => {
    await assertSucceeds(listAll(ref(storageFor('publisher@example.com', 'publisher'), 'cards')))
    await assertFails(deleteObject(ref(storageFor('publisher@example.com', 'publisher'), 'cards/c1/outro.webp')))
    await assertSucceeds(uploadBytes(ref(storageFor('admin@example.com', 'admin'), 'cards/c1/mapa.webp'), new Uint8Array([5]), { contentType: 'image/webp' }))
    await assertFails(uploadBytes(ref(storageFor('admin@example.com', 'admin'), 'cards/c1/script.html'), new Uint8Array([5]), { contentType: 'text/html' }))
    await assertFails(uploadBytes(ref(storageFor('admin@example.com', 'admin'), 'cards/c1/grande.pdf'), new Uint8Array(21 * 1024 * 1024), { contentType: 'application/pdf' }))
    await assertFails(listAll(ref(env.unauthenticatedContext().storage('gs://demo-meu-territorio.appspot.com'), 'cards')))
    await assertFails(listAll(ref(storageFor('missing@example.com', 'missing'), 'cards')))
  }, 30000)
})
