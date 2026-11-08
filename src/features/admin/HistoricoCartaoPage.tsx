import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import type { EventoCartao } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartoes } from '@/features/cards/useCartoes'
import { observarEventos } from '@/firebase/cards'
import { dataHora, hora, iconeEvento, textoEvento, tituloEvento } from './textoEvento'

/** `undefined` enquanto carrega. */
function useEventos(cartaoId: string): EventoCartao[] | undefined {
  const [atual, setAtual] = useState<{ id: string; eventos: EventoCartao[] } | null>(null)
  useEffect(() => observarEventos(cartaoId, (eventos) => setAtual({ id: cartaoId, eventos })), [cartaoId])
  return atual?.id === cartaoId ? atual.eventos : undefined
}

type Rodada = { numero: number; abertaPor?: string; abertaEm?: number; encerradaPor?: string; encerradaEm?: number }

/** Agrupa os eventos de rodada por quadra (rótulo), da quadra e da rodada mais recentes para as mais antigas. */
function rodadasPorQuadra(eventos: EventoCartao[]): { rotulo: string; rodadas: Rodada[] }[] {
  const quadras = new Map<string, Map<number, Rodada>>()
  for (const e of eventos) {
    if (e.tipo !== 'rodada' || e.quadraRotulo === undefined || e.rodada === undefined) continue
    const rodadas = quadras.get(e.quadraRotulo) ?? new Map<number, Rodada>()
    const r = rodadas.get(e.rodada) ?? { numero: e.rodada }
    if (e.motivo === 'rodada_aberta') { r.abertaPor = e.porNome; r.abertaEm = e.em }
    if (e.motivo === 'rodada_encerrada') { r.encerradaPor = e.porNome; r.encerradaEm = e.em }
    rodadas.set(e.rodada, r)
    quadras.set(e.quadraRotulo, rodadas)
  }
  return [...quadras].map(([rotulo, rodadas]) => ({ rotulo, rodadas: [...rodadas.values()].sort((a, b) => b.numero - a.numero) }))
}

function Eventos({ cartaoId }: { cartaoId: string }) {
  const eventos = useEventos(cartaoId)

  if (eventos === undefined) return <div role="status" aria-label="Carregando" style={{ marginTop: 14 }}>
    {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto" style={{ height: 56, marginBottom: 14 }} />)}
  </div>

  if (eventos.length === 0) return <div className="sem-casas">
    <h2 style={{ fontSize: 20, marginBottom: 8 }}>Nenhum registro ainda</h2>
    <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Este cartão ainda não foi fechado nem reaberto.</p>
  </div>

  const quadras = rodadasPorQuadra(eventos)
  return <>
    {quadras.length > 0 && <section aria-labelledby="rodadas-por-quadra">
      <h2 className="titulo-secao" id="rodadas-por-quadra">Rodadas por quadra</h2>
      {quadras.map((q) => <div key={q.rotulo} style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 18 }}>{q.rotulo}</h3>
        <ul style={{ listStyle: 'none' }}>
          {q.rodadas.map((r) => <li key={r.numero} style={{ padding: '6px 0' }}>
            <b>Rodada {r.numero}</b>
            {r.abertaEm !== undefined && <div className="quem">aberta por {r.abertaPor} às {hora(r.abertaEm)}</div>}
            {r.encerradaEm !== undefined && <div className="quem">encerrada por {r.encerradaPor} às {hora(r.encerradaEm)}</div>}
          </li>)}
        </ul>
      </div>)}
    </section>}
    <ol className="tempo" aria-label="Eventos do cartão">
      {eventos.map((e) => <li key={e.id} className="evento">
        <span className="marca"><Icone nome={iconeEvento(e)} /></span>
        <div>
          <b>{tituloEvento(e)}</b>
          <div className="quando">{dataHora(e.em)}</div>
          <div className="quem">{textoEvento(e)}</div>
        </div>
      </li>)}
    </ol>
  </>
}

export default function HistoricoCartaoPage() {
  const { cartaoId = '' } = useParams()
  const { membro } = useSessao()
  const cartoes = useCartoes()
  const cartao = cartoes?.find((c) => c.id === cartaoId)

  return <>
    <Topo titulo="Histórico" voltarPara={`/admin/cartao/${cartaoId}`} voltarRotulo="Voltar para o cartão" sub="Quando cada cartão foi aberto ou fechado" />
    {membro?.papel !== 'admin'
      ? <div className="rolagem"><div className="sem-casas" style={{ paddingTop: 56 }}>
        <Icone nome="cadeado" className="ic ic-32" />
        <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>Só para administradores</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Peça a um administrador da congregação para consultar este histórico.</p>
      </div></div>
      : <div className="rolagem com-nav">
        <div className="aviso" role="note" style={{ marginTop: 14 }}>
          <Icone nome="info" />
          <p>Mostra quem abriu ou fechou o cartão e quando.</p>
        </div>
        {cartao && <h2 className="titulo-secao">Cartão {cartao.numero} · {cartao.titulo}</h2>}
        <Eventos key={cartaoId} cartaoId={cartaoId} />
      </div>}
  </>
}
