// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'

const PROJETO = process.env.GCLOUD_PROJECT ?? 'demo-territorios'
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`
const docUrl = (email: string) =>
  `${FS}/v1/projects/${PROJETO}/databases/(default)/documents/members/${encodeURIComponent(email)}`
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

async function criarUsuario(email: string) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST', headers: H, body: JSON.stringify({ email, password: 'senha-de-teste-123' }),
  })
  expect(r.ok).toBe(true)
}
async function contaExiste(email: string): Promise<boolean> {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJETO}/accounts:lookup`, {
    method: 'POST', headers: H, body: JSON.stringify({ email: [email] }),
  })
  const j = (await r.json()) as { users?: unknown[] }
  return (j.users?.length ?? 0) > 0
}
const gravarMembro = (email: string) =>
  fetch(docUrl(email), { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { papel: { stringValue: 'membro' } } }) })
const apagarMembro = (email: string) => fetch(docUrl(email), { method: 'DELETE', headers: H })
async function esperar(cond: () => Promise<boolean>, ms = 10000) {
  const fim = Date.now() + ms
  while (Date.now() < fim) {
    if (await cond()) return true
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

describe('função apagarContaAoRemoverMembro', () => {
  beforeAll(() => { expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeTruthy() })

  it('apaga a conta do Auth quando o membro é removido', async () => {
    const email = 'remover@exemplo.com'
    await criarUsuario(email)
    expect(await contaExiste(email)).toBe(true)
    await gravarMembro(email)
    await apagarMembro(email)
    expect(await esperar(async () => !(await contaExiste(email)))).toBe(true)
  }, 20000)

  it('mantém a conta se o membro é liberado de novo logo em seguida', async () => {
    const email = 'volta@exemplo.com'
    await criarUsuario(email)
    await gravarMembro(email)
    await apagarMembro(email)
    await gravarMembro(email)
    await new Promise((r) => setTimeout(r, 5000))
    expect(await contaExiste(email)).toBe(true)
  }, 20000)
})
