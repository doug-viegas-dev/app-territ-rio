import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import type { EventoCartao } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartoes } from '@/features/cards/useCartoes'
import { observarEventos } from '@/firebase/cards'
import { textoEvento } from './textoEvento'

const dataHora = (ms: number) => {
  const d = new Date(ms)
  return `${d.toLocaleDateString('pt-BR')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** `undefined` enquanto carrega. */
function useEventos(cartaoId: string): EventoCartao[] | undefined {
  const [atual, setAtual] = useState<{ id: string; eventos: EventoCartao[] } | null>(null)
  useEffect(() => observarEventos(cartaoId, (eventos) => setAtual({ id: cartaoId, eventos })), [cartaoId])
  return atual?.id === cartaoId ? atual.eventos : undefined
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

  return <ol className="tempo" aria-label="Eventos do cartão">
    {eventos.map((e) => <li key={e.id} className="evento">
      <span className="marca"><Icone nome={e.tipo === 'aberto' ? 'cadeado-aberto' : 'cadeado'} /></span>
      <div>
        <b>{e.tipo === 'aberto' ? 'Aberto' : 'Fechado'}</b>
        <div className="quando">{dataHora(e.em)}</div>
        <div className="quem">{textoEvento(e)}</div>
      </div>
    </li>)}
  </ol>
}

export default function HistoricoCartaoPage() {
  const { cartaoId = '' } = useParams()
  const { membro } = useSessao()
  const cartoes = useCartoes()
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const atual = escolhido ?? cartaoId
  const cartao = cartoes?.find((c) => c.id === atual)

  return <>
    <Topo titulo="Histórico" voltarPara={`/admin/cartao/${cartaoId}`} voltarRotulo="Voltar para o cartão" sub="Quando cada cartão foi aberto ou fechado" />
    {membro?.papel !== 'admin'
      ? <div className="rolagem"><div className="sem-casas" style={{ paddingTop: 56 }}>
        <Icone nome="cadeado" className="ic ic-32" />
        <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>Só para administradores</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Peça a um administrador da congregação para consultar este histórico.</p>
      </div></div>
      : <div className="rolagem com-nav">
        {(cartoes?.length ?? 0) > 0 && <div className="campo" style={{ marginBottom: 8 }}>
          <span className="rotulo-campo" id="historico-cartao">Cartão</span>
          <div className="chips" role="radiogroup" aria-labelledby="historico-cartao">
            {cartoes?.map((c) => <button key={c.id} type="button" role="radio" aria-checked={c.id === atual} className={c.id === atual ? 'chip sel' : 'chip'} onClick={() => setEscolhido(c.id)}>
              {c.id === atual && <Icone nome="check" className="ic ic-20" />}{c.numero}
            </button>)}
          </div>
        </div>}
        <div className="aviso" role="note" style={{ marginTop: 14 }}>
          <Icone nome="info" />
          <p>Mostra quem abriu ou fechou o cartão e quando. Só os últimos 10 registros aparecem.</p>
        </div>
        {cartao && <h2 className="titulo-secao">Cartão {cartao.numero} · {cartao.titulo}</h2>}
        <Eventos key={atual} cartaoId={atual} />
      </div>}
  </>
}
