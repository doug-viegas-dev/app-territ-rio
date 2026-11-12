import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import type { EventoCartao } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartoes } from '@/features/cards/useCartoes'
import { observarEventos } from '@/firebase/cards'
import { EditarEvento } from './EditarEvento'
import { ExcluirEvento } from './ExcluirEvento'
import { dataHora, diaEHora, iconeEvento, textoEvento, tituloEvento } from './textoEvento'

/** `undefined` enquanto carrega. */
function useEventos(cartaoId: string): EventoCartao[] | undefined {
  const [atual, setAtual] = useState<{ id: string; eventos: EventoCartao[] } | null>(null)
  useEffect(() => observarEventos(cartaoId, (eventos) => setAtual({ id: cartaoId, eventos })), [cartaoId])
  return atual?.id === cartaoId ? atual.eventos : undefined
}

type Rodada = { numero: number; abertaPor?: string; abertaEm?: number; encerradaPor?: string; encerradaEm?: number }

/**
 * Agrupa os eventos de volta por quadra (`quadraId`; sem ele, o rótulo), com as voltas da mais recente para a mais antiga.
 * O número recomeça em 1 a cada abertura do cartão, então não identifica a volta: varre os eventos em ordem cronológica,
 * cada abertura cria uma entrada e cada encerramento fecha a entrada mais recente do mesmo número ainda aberta.
 */
function rodadasPorQuadra(eventos: EventoCartao[]): { chave: string; rotulo: string; rodadas: Rodada[] }[] {
  const quadras = new Map<string, { rotulo: string; rodadas: Rodada[] }>()
  const ordenados = eventos.filter((e) => e.tipo === 'rodada' && e.quadraRotulo !== undefined && e.rodada !== undefined).sort((a, b) => a.em - b.em)
  for (const e of ordenados) {
    const chave = e.quadraId ?? e.quadraRotulo!
    const grupo = quadras.get(chave) ?? { rotulo: e.quadraRotulo!, rodadas: [] }
    quadras.set(chave, grupo)
    if (e.motivo === 'rodada_aberta') {
      grupo.rodadas.push({ numero: e.rodada!, abertaPor: e.porNome, abertaEm: e.em })
    } else if (e.motivo === 'rodada_encerrada') {
      const aberta = [...grupo.rodadas].reverse().find((r) => r.numero === e.rodada && r.encerradaEm === undefined)
      if (aberta) { aberta.encerradaPor = e.porNome; aberta.encerradaEm = e.em }
      else grupo.rodadas.push({ numero: e.rodada!, encerradaPor: e.porNome, encerradaEm: e.em })
    }
  }
  const inicio = (r: Rodada) => r.abertaEm ?? r.encerradaEm ?? 0
  return [...quadras].map(([chave, g]) => ({ chave, rotulo: g.rotulo, rodadas: [...g.rodadas].sort((a, b) => inicio(b) - inicio(a)) }))
}

function Eventos({ cartaoId }: { cartaoId: string }) {
  const eventos = useEventos(cartaoId)
  const [editando, setEditando] = useState<EventoCartao | null>(null)
  const [excluindo, setExcluindo] = useState<EventoCartao | null>(null)

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
      <h2 className="titulo-secao" id="rodadas-por-quadra">Voltas por quadra</h2>
      {quadras.map((q) => <div key={q.chave} style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 18 }}>{q.rotulo}</h3>
        <ul style={{ listStyle: 'none' }}>
          {q.rodadas.map((r) => <li key={`${r.numero}-${r.abertaEm ?? r.encerradaEm}`} style={{ padding: '6px 0' }}>
            <b>Volta {r.numero}</b>
            {r.abertaEm !== undefined && <div className="quem">aberta por {r.abertaPor} em {diaEHora(r.abertaEm)}</div>}
            {r.encerradaEm !== undefined && <div className="quem">encerrada por {r.encerradaPor} em {diaEHora(r.encerradaEm)}</div>}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn secundario auto" aria-label={`Editar registro: ${tituloEvento(e)}, ${dataHora(e.em)}`} onClick={() => setEditando(e)}>Editar</button>
            <button type="button" className="btn perigo auto" aria-label={`Excluir registro: ${tituloEvento(e)}, ${dataHora(e.em)}`} onClick={() => setExcluindo(e)}>Excluir</button>
          </div>
        </div>
      </li>)}
    </ol>
    {editando && <EditarEvento cartaoId={cartaoId} evento={editando} onFechar={() => setEditando(null)} />}
    {excluindo && <ExcluirEvento cartaoId={cartaoId} evento={excluindo} onFechar={() => setExcluindo(null)} />}
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
          <p>Mostra quem abriu ou fechou o cartão e quando. Você pode corrigir a data e o nome, ou excluir um registro.</p>
        </div>
        {cartao && <h2 className="titulo-secao">Cartão {cartao.numero} · {cartao.titulo}</h2>}
        <Eventos key={cartaoId} cartaoId={cartaoId} />
      </div>}
  </>
}
