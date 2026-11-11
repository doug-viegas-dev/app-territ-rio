import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from './app'
import { demoAtivo } from '@/demo/modo'

const SIMULTANEOS = 6
const INTERVALO_MIN_MS = 10 * 60 * 1000

async function emLotes<T>(itens: T[], fn: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < itens.length) await fn(itens[proximo++])
  }
  await Promise.all(Array.from({ length: Math.min(SIMULTANEOS, itens.length) }, trabalhador))
}

/** Uma falha numa leitura (rede, permissão) não pode impedir o resto do download. */
const tentar = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
  try { return await fn() } catch { return null }
}

let ultimo = 0
let emAndamento: Promise<void> | null = null

/**
 * Baixa cartões, quadras, casas, visitas e rodadas para o cache do aparelho,
 * para que tudo abra sem internet. Só faz sentido com rede; erros são ignorados.
 */
export function baixarTudo(opcoes: { admin: boolean }, forcar = false): Promise<void> {
  if (demoAtivo()) return Promise.resolve()
  if (emAndamento) return emAndamento
  if (!forcar && Date.now() - ultimo < INTERVALO_MIN_MS) return Promise.resolve()
  ultimo = Date.now()
  emAndamento = (async () => {
    const cartoes = await tentar(() => getDocs(collection(db, 'cards')))
    if (!cartoes) { ultimo = 0; return }
    await emLotes(cartoes.docs, async (cartao) => {
      const base = ['cards', cartao.id] as const
      if (opcoes.admin) await tentar(() => getDocs(query(collection(db, ...base, 'eventos'), orderBy('em', 'desc'), limit(50))))
      const quadras = await tentar(() => getDocs(query(collection(db, ...base, 'blocks'), orderBy('ordem'))))
      if (!quadras) return
      await emLotes(quadras.docs, async (quadra) => {
        const qBase = [...base, 'blocks', quadra.id] as const
        await tentar(() => getDocs(query(collection(db, ...qBase, 'rodadas'), orderBy('numero', 'desc'))))
        const casas = await tentar(() => getDocs(collection(db, ...qBase, 'houses')))
        if (!casas) return
        await emLotes(casas.docs, async (casa) => {
          await tentar(() => getDocs(query(collection(db, ...qBase, 'houses', casa.id, 'visits'), orderBy('em', 'desc'))))
        })
      })
    })
  })().finally(() => { emAndamento = null })
  return emAndamento
}
