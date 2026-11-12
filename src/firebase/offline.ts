import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from './app'
import { demoAtivo } from '@/demo/modo'
import { guardarDoc, guardarLista } from './cache'
import { baixarImagem } from './storage'

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
    guardarLista('cards', cartoes.docs)
    await emLotes(cartoes.docs, async (cartao) => {
      guardarDoc(`cards/${cartao.id}`, cartao.id, cartao.data())
      const base = ['cards', cartao.id] as const
      const imagemPath = cartao.data().imagemPath
      const imagem = typeof imagemPath === 'string' ? tentar(() => baixarImagem(imagemPath)) : null
      if (opcoes.admin) {
        const eventos = await tentar(() => getDocs(query(collection(db, ...base, 'eventos'), orderBy('em', 'desc'), limit(50))))
        if (eventos) guardarLista(`cards/${cartao.id}/eventos`, eventos.docs)
      }
      const quadras = await tentar(() => getDocs(query(collection(db, ...base, 'blocks'), orderBy('ordem'))))
      if (!quadras) return
      guardarLista(`cards/${cartao.id}/blocks`, quadras.docs)
      await emLotes(quadras.docs, async (quadra) => {
        const qBase = [...base, 'blocks', quadra.id] as const
        const rodadas = await tentar(() => getDocs(query(collection(db, ...qBase, 'rodadas'), orderBy('abertaEm', 'desc'))))
        if (rodadas) guardarLista(`cards/${cartao.id}/blocks/${quadra.id}/rodadas`, rodadas.docs)
        const casas = await tentar(() => getDocs(collection(db, ...qBase, 'houses')))
        if (!casas) return
        guardarLista(`cards/${cartao.id}/blocks/${quadra.id}/houses`, casas.docs)
        await emLotes(casas.docs, async (casa) => {
          const visitas = await tentar(() => getDocs(query(collection(db, ...qBase, 'houses', casa.id, 'visits'), orderBy('em', 'desc'))))
          if (visitas) guardarLista(`cards/${cartao.id}/blocks/${quadra.id}/houses/${casa.id}/visits`, visitas.docs)
        })
      })
      await imagem
    })
  })().finally(() => { emAndamento = null })
  return emAndamento
}
