import { collection, getDocsFromServer, writeBatch, type DocumentData, type DocumentReference, type Timestamp } from 'firebase/firestore'
import { vencimentoDoRegistro } from '@/domain/historico'
import { demoAtivo } from '@/demo/modo'
import { db } from './app'
import { paraMs, paraTimestamp } from './converters'
import { LOTE, recalcularContadores } from './houses'

type Escrita = { ref: DocumentReference; dados: DocumentData }

/**
 * "Atualizar dados": troca os status antigos 'estudo' e 'nao_visitar' das casas pelas marcas e dá vencimento (`expiraEm`) às visitas antigas.
 * Lê do servidor, nunca do cache. Pode ser repetida: o que já está atualizado não é regravado.
 */
export async function atualizarDadosDoCartao(cartaoId: string, usuario: { nome: string }): Promise<{ casas: number; visitas: number }> {
  if (demoAtivo()) return { casas: 0, visitas: 0 }
  const agora: Timestamp = paraTimestamp(Date.now())
  const escritas: Escrita[] = []
  let casas = 0
  let visitas = 0
  const quadras = await getDocsFromServer(collection(db, 'cards', cartaoId, 'blocks'))
  for (const q of quadras.docs) {
    const doCartao = await getDocsFromServer(collection(q.ref, 'houses'))
    for (const c of doCartao.docs) {
      const d = c.data()
      const marca = d.status === 'nao_visitar' ? 'naoVisitar' : d.status === 'estudo' ? 'estudo' : null
      if (marca) {
        casas++
        escritas.push({
          ref: c.ref,
          dados: {
            status: 'pendente',
            [marca]: true,
            ...(typeof d[`${marca}Por`] !== 'string' && { [`${marca}Por`]: usuario.nome }),
            ...(paraMs(d[`${marca}Em`]) === undefined && { [`${marca}Em`]: agora }),
          },
        })
      }
      for (const v of (await getDocsFromServer(collection(c.ref, 'visits'))).docs) {
        const em = paraMs(v.data().em)
        if (em === undefined || paraMs(v.data().expiraEm) !== undefined) continue
        visitas++
        escritas.push({ ref: v.ref, dados: { expiraEm: paraTimestamp(vencimentoDoRegistro(em)) } })
      }
    }
  }
  for (let i = 0; i < escritas.length; i += LOTE) {
    const batch = writeBatch(db)
    for (const e of escritas.slice(i, i + LOTE)) batch.update(e.ref, e.dados)
    await batch.commit()
  }
  // sempre recalcula: se uma execução anterior parou no meio, as casas já estão certas mas as contas não
  await recalcularContadores(cartaoId)
  return { casas, visitas }
}
