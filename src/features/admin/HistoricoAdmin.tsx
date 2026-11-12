import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import type { Cartao, EventoCartao } from '@/domain/types'
import { useCartoes } from '@/features/cards/useCartoes'
import { observarEventos } from '@/firebase/cards'
import { dataHora, iconeEvento, textoEvento, tituloEvento } from './textoEvento'

type EventoDoCartao = EventoCartao & { cartaoId: string }

/** Registros mais recentes lidos de cada cartão: limita o custo de uma assinatura por cartão. */
const POR_CARTAO = 20

/** Uma assinatura por cartão; `undefined` até todos responderem. */
function useEventosDeTodos(cartoes: Cartao[] | null): EventoDoCartao[] | undefined {
  const chave = cartoes?.map((c) => c.id).join('|') ?? null
  const [lido, setLido] = useState<{ chave: string; porCartao: Record<string, EventoCartao[]> } | null>(null)

  useEffect(() => {
    if (chave === null) return
    const ids = chave === '' ? [] : chave.split('|')
    const recebidos: Record<string, EventoCartao[]> = {}
    const cancelar = ids.map((id) => observarEventos(id, (eventos) => {
      recebidos[id] = eventos
      if (ids.every((i) => recebidos[i])) setLido({ chave, porCartao: { ...recebidos } })
    }, POR_CARTAO))
    return () => cancelar.forEach((c) => c())
  }, [chave])

  return useMemo(() => {
    if (chave === '') return []
    if (lido === null || lido.chave !== chave) return undefined
    return Object.entries(lido.porCartao)
      .flatMap(([cartaoId, eventos]) => eventos.map((e) => ({ ...e, cartaoId })))
      .sort((a, b) => b.em - a.em)
  }, [lido, chave])
}

export default function HistoricoAdmin() {
  const cartoes = useCartoes()
  const eventos = useEventosDeTodos(cartoes)
  const [filtro, setFiltro] = useState('')
  const filtroValido = cartoes?.some((c) => c.id === filtro) ? filtro : ''

  if (cartoes === null || eventos === undefined) return <div role="status" aria-label="Carregando" style={{ marginTop: 14 }}>
    {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto" style={{ height: 56, marginBottom: 14 }} />)}
  </div>

  const visiveis = filtroValido ? eventos.filter((e) => e.cartaoId === filtroValido) : eventos
  const cartaoPorId = new Map(cartoes.map((c) => [c.id, c]))

  return <>
    <div className="campo" style={{ marginTop: 14 }}>
      <label htmlFor="historico-filtro">Cartão</label>
      <select id="historico-filtro" className="entrada" value={filtroValido} onChange={(ev) => setFiltro(ev.target.value)}>
        <option value="">Todos os cartões</option>
        {cartoes.map((c) => <option key={c.id} value={c.id}>Cartão {c.numero} · {c.titulo}</option>)}
      </select>
    </div>
    {visiveis.length === 0
      ? <div className="sem-casas">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Nenhum registro ainda</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Quando um cartão for aberto, fechado ou tiver uma volta, aparece aqui.</p>
      </div>
      : <ol className="tempo" aria-label="Eventos de todos os cartões">
        {visiveis.map((e) => {
          const c = cartaoPorId.get(e.cartaoId)
          return <li key={`${e.cartaoId}-${e.id}`} className="evento">
            <span className="marca"><Icone nome={iconeEvento(e)} /></span>
            <Link to={`/admin/cartao/${e.cartaoId}/historico`} style={{ display: 'block', minHeight: 48 }}>
              <b>{tituloEvento(e)}</b>
              <div className="quando">Cartão {c?.numero ?? '?'} · {dataHora(e.em)}</div>
              <div className="quem">{textoEvento(e)}</div>
            </Link>
          </li>
        })}
      </ol>}
  </>
}
