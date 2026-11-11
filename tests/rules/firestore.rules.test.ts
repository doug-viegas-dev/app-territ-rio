import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

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
    await assertFails(batch.commit())
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
    // com o cartão ainda aberto, o evento sozinho (sem fechar o cartão no mesmo batch) é recusado
    await assertFails(setDoc(doc(events, 'auto'), { tipo: 'fechado', motivo: 'fechamento_automatico', porUid: 'publisher', porNome: 'Publicador', em: 3 }))
    await assertSucceeds(setDoc(doc(events, 'auto'), { tipo: 'rodada', motivo: 'rodada_aberta', porUid: 'publisher', porNome: 'Publicador', em: 3, quadraId: 'b1', quadraRotulo: 'Quadra 1', rodada: 1 }))
    await assertFails(setDoc(doc(events, 'fake'), { tipo: 'aberto', motivo: 'abertura', porUid: 'publisher', porNome: 'Publicador', em: 3 }))
    await assertFails(setDoc(doc(events, 'other'), { tipo: 'rodada', motivo: 'rodada_aberta', porUid: 'other', porNome: 'Outra pessoa', em: 3 }))
    await assertFails(updateDoc(doc(events, 'auto'), { porNome: 'Alterado' }))
    await assertFails(deleteDoc(doc(events, 'auto')))

    const admin = adminDb()
    await assertSucceeds(getDocs(collection(admin, 'cards/c1/eventos')))
    await assertSucceeds(setDoc(doc(admin, 'cards/c1/eventos/manual'), { tipo: 'aberto', motivo: 'abertura', porUid: 'admin', porNome: 'admin', em: 4 }))
    // o administrador corrige o histórico: muda quando e por quem, e apaga; tipo e motivo ficam como estão
    await assertSucceeds(updateDoc(doc(admin, 'cards/c1/eventos/manual'), { porNome: 'Alterado', em: 5 }))
    await assertFails(updateDoc(doc(admin, 'cards/c1/eventos/manual'), { motivo: 'fechamento_manual' }))
    await assertSucceeds(deleteDoc(doc(admin, 'cards/c1/eventos/manual')))
  })

  it('permite ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  administraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o gerir membros e cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes e remover casas', async () => {
    const db = adminDb()
    await assertSucceeds(getDoc(doc(db, 'members/admin@example.com')))
    await assertSucceeds(setDoc(doc(db, 'members/new@example.com'), member()))
    // o administrador não se desativa, não rebaixa e não se apaga
    await assertFails(setDoc(doc(db, 'members/admin@example.com'), member('admin', false)))
    await assertFails(setDoc(doc(db, 'members/admin@example.com'), member('publicador')))
    await assertFails(deleteDoc(doc(db, 'members/admin@example.com')))
    await assertSucceeds(setDoc(doc(db, 'members/admin@example.com'), { ...member('admin'), nome: 'Outro nome' }))
    await assertSucceeds(deleteDoc(doc(db, 'members/new@example.com')))
    await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { titulo: 'Novo tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­tulo' }))
    await assertSucceeds(setDoc(doc(db, 'cards/c2'), card))
    await assertSucceeds(deleteDoc(doc(db, 'cards/c1/blocks/b1/houses/h1')))
  })

  it('publicador atualiza totalCasas, faltam e rodadasTotal da quadra', async () => {
    const block = doc(publisherDb(), 'cards/c1/blocks/b1')
    await assertSucceeds(updateDoc(block, { totalCasas: 10, faltam: 10 }))
    await assertSucceeds(updateDoc(block, { faltam: 9 }))
  })

  it('publicador não renomeia a quadra nem remove rua', async () => {
    const block = doc(publisherDb(), 'cards/c1/blocks/b1')
    await assertFails(updateDoc(block, { rotulo: 'Outra', totalCasas: 3 }))
    await assertFails(updateDoc(block, { ruas: [], totalCasas: 3 }))
  })

  const rodadaAtual = { id: 'r1', numero: 1, porNome: 'Publicador', em: 5 }

  it('publicador define rodadaAtual quando está vazia', async () => {
    await assertSucceeds(updateDoc(doc(publisherDb(), 'cards/c1/blocks/b1'), { rodadaAtual, rodadasTotal: 1 }))
  })

  it('segunda definição de rodadaAtual é negada', async () => {
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), 'cards/c1/blocks/b1'), { rodadaAtual, rodadasTotal: 1 }))
    const block = doc(publisherDb(), 'cards/c1/blocks/b1')
    await assertFails(updateDoc(block, { rodadaAtual: { ...rodadaAtual, id: 'r2', numero: 2 }, rodadasTotal: 2 }))
  })

  it('rodadasTotal que não sobe de 1 em 1 é negado', async () => {
    const block = doc(publisherDb(), 'cards/c1/blocks/b1')
    await assertFails(updateDoc(block, { rodadaAtual, rodadasTotal: 2 }))
    await assertFails(updateDoc(block, { rodadaAtual, rodadasTotal: 0 }))
    await assertFails(updateDoc(block, { rodadasTotal: 1 }))
  })

  it('publicador encerra a rodada (remove rodadaAtual)', async () => {
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), 'cards/c1/blocks/b1'), { rodadaAtual, rodadasTotal: 1 }))
    const block = doc(publisherDb(), 'cards/c1/blocks/b1')
    await assertFails(updateDoc(block, { rodadaAtual: deleteField(), rodadasTotal: 5 }))
    await assertSucceeds(updateDoc(block, { rodadaAtual: deleteField() }))
  })

  it('membro cria rodada com abertaPorUid próprio e é negado com uid de outro', async () => {
    const db = publisherDb()
    const dados = { numero: 1, abertaPorUid: 'publisher', abertaPorNome: 'Publicador', abertaEm: 5 }
    await assertSucceeds(setDoc(doc(db, 'cards/c1/blocks/b1/rodadas/r1'), dados))
    await assertFails(setDoc(doc(db, 'cards/c1/blocks/b1/rodadas/r2'), { ...dados, abertaPorUid: 'outro' }))
    await assertSucceeds(getDoc(doc(db, 'cards/c1/blocks/b1/rodadas/r1')))
    await assertFails(deleteDoc(doc(db, 'cards/c1/blocks/b1/rodadas/r1')))
    await assertFails(setDoc(doc(user('inactive@example.com', 'inactive'), 'cards/c1/blocks/b1/rodadas/r3'), { ...dados, abertaPorUid: 'inactive' }))
  })

  it('rodada só aceita preencher campos de encerramento no update', async () => {
    const ref = doc(publisherDb(), 'cards/c1/blocks/b1/rodadas/r1')
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'cards/c1/blocks/b1/rodadas/r1'), { numero: 1, abertaPorUid: 'publisher', abertaPorNome: 'Publicador', abertaEm: 5 }))
    await assertFails(updateDoc(ref, { abertaPorNome: 'Outro' }))
    await assertFails(updateDoc(ref, { encerradaPorUid: 'outro', encerradaPorNome: 'Outro', encerradaEm: 9 }))
    await assertFails(updateDoc(ref, { encerradaPorUid: 'publisher', numero: 7 }))
    await assertSucceeds(updateDoc(ref, { encerradaPorUid: 'publisher', encerradaPorNome: 'Publicador', encerradaEm: 9 }))
  })

  it('rodada já encerrada não é encerrada de novo', async () => {
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'cards/c1/blocks/b1/rodadas/r1'), { numero: 1, abertaPorUid: 'publisher', abertaPorNome: 'Publicador', abertaEm: 5 }))
    const ref = doc(publisherDb(), 'cards/c1/blocks/b1/rodadas/r1')
    await assertSucceeds(updateDoc(ref, { encerradaPorUid: 'publisher', encerradaPorNome: 'Publicador', encerradaEm: 9 }))
    await assertFails(updateDoc(ref, { encerradaPorUid: 'publisher', encerradaPorNome: 'Publicador', encerradaEm: 12 }))
    await assertFails(updateDoc(doc(adminDb(), 'cards/c1/blocks/b1/rodadas/r1'), { encerradaPorUid: 'admin', encerradaPorNome: 'admin', encerradaEm: 12 }))
  })

  it('publicador encerra a rodada mesmo com o cartão fechado', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const f = context.firestore()
      await updateDoc(doc(f, 'cards/c1'), { estado: 'fechado' })
      await updateDoc(doc(f, 'cards/c1/blocks/b1'), { rodadaAtual, rodadasTotal: 1 })
      await setDoc(doc(f, 'cards/c1/blocks/b1/rodadas/r1'), { numero: 1, abertaPorUid: 'publisher', abertaPorNome: 'Publicador', abertaEm: 5 })
    })
    const db = publisherDb()
    const batch = writeBatch(db)
    batch.update(doc(db, 'cards/c1/blocks/b1/rodadas/r1'), { encerradaPorUid: 'publisher', encerradaPorNome: 'Publicador', encerradaEm: 9 })
    batch.update(doc(db, 'cards/c1/blocks/b1'), { rodadaAtual: deleteField() })
    batch.set(doc(db, 'cards/c1/eventos/fim'), { tipo: 'rodada', motivo: 'rodada_encerrada', porUid: 'publisher', porNome: 'Publicador', em: 9, quadraId: 'b1', quadraRotulo: 'Quadra 1', rodada: 1 })
    await assertSucceeds(batch.commit())
  })

  it('publicador cria evento rodada_aberta com o próprio uid e é negado a criar fechamento_automatico ou fechado', async () => {
    const events = collection(publisherDb(), 'cards/c1/eventos')
    const base = { porNome: 'Publicador', em: 3, quadraId: 'b1', quadraRotulo: 'Quadra 1', rodada: 1 }
    await assertSucceeds(setDoc(doc(events, 'e1'), { ...base, tipo: 'rodada', motivo: 'rodada_aberta', porUid: 'publisher' }))
    await assertSucceeds(setDoc(doc(events, 'e2'), { ...base, tipo: 'rodada', motivo: 'rodada_encerrada', porUid: 'publisher' }))
    await assertFails(setDoc(doc(events, 'e3'), { ...base, tipo: 'rodada', motivo: 'rodada_aberta', porUid: 'outro' }))
    await assertFails(setDoc(doc(events, 'e4'), { ...base, tipo: 'rodada', motivo: 'fechamento_manual', porUid: 'publisher' }))
    await assertFails(setDoc(doc(events, 'e5'), { ...base, tipo: 'fechado', motivo: 'fechamento_automatico', porUid: 'publisher' }))
    await assertFails(setDoc(doc(events, 'e6'), { ...base, tipo: 'fechado', motivo: 'fechamento_manual', porUid: 'publisher' }))
  })

  it('publicador não muda o estado do cartão', async () => {
    const ref = doc(publisherDb(), 'cards/c1')
    await assertFails(updateDoc(ref, { estado: 'fechado' }))
    await assertFails(updateDoc(ref, { ciclo: 2 }))
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), 'cards/c1'), { estado: 'fechado' }))
    await assertFails(updateDoc(ref, { estado: 'aberto' }))
  })

  it('publicador cria casas em faixa com os mesmos campos que criarCasasEmFaixa grava, e é permitido', async () => {
    const db = publisherDb()
    const antes = (await getDocs(collection(db, 'cards/c1/blocks/b1/houses'))).size
    const batch = writeBatch(db)
    ;['10', '12', '14'].forEach((numero, i) => batch.set(doc(collection(db, 'cards/c1/blocks/b1/houses')), { rua: 'Rua A', numero, ordem: 10 + i, status: 'pendente', criadoEm: 5 }))
    batch.update(doc(db, 'cards/c1'), { totalCasas: increment(3), atualizadoEm: 6 })
    batch.update(doc(db, 'cards/c1/blocks/b1'), { totalCasas: increment(3), faltam: increment(3) })
    await assertSucceeds(batch.commit())
    expect((await getDocs(collection(db, 'cards/c1/blocks/b1/houses'))).size).toBe(antes + 3)
  })

  it('publicador que tenta mudar o estado do cartão no mesmo lote da faixa é negado, e nada é gravado', async () => {
    const db = publisherDb()
    const antes = (await getDocs(collection(db, 'cards/c1/blocks/b1/houses'))).size
    const batch = writeBatch(db)
    batch.set(doc(collection(db, 'cards/c1/blocks/b1/houses')), { rua: 'Rua A', numero: '10', ordem: 10, status: 'pendente', criadoEm: 5 })
    batch.update(doc(db, 'cards/c1'), { totalCasas: increment(1), atualizadoEm: 6, estado: 'fechado' })
    batch.update(doc(db, 'cards/c1/blocks/b1'), { totalCasas: increment(1), faltam: increment(1) })
    await assertFails(batch.commit())
    expect((await getDocs(collection(db, 'cards/c1/blocks/b1/houses'))).size).toBe(antes)
    expect((await getDoc(doc(db, 'cards/c1'))).data()?.estado).toBe('aberto')
  })

  it('publicador atualiza resolvidas, totalCasas e atualizadoEm do cartão', async () => {
    await assertSucceeds(updateDoc(doc(publisherDb(), 'cards/c1'), { resolvidas: 2, totalCasas: 5, atualizadoEm: 9 }))
  })

  it('admin fecha o cartão', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'cards/c1'), { estado: 'fechado', ciclo: 2 }))
  })

  it('só a administração lista todos os membros; o publicador lê apenas o próprio documento', async () => {
    await assertSucceeds(getDocs(collection(adminDb(), 'members')))
    await assertSucceeds(getDoc(doc(publisherDb(), 'members/publisher@example.com')))
    await assertFails(getDoc(doc(publisherDb(), 'members/admin@example.com')))
    await assertFails(getDocs(collection(publisherDb(), 'members')))
  })
})