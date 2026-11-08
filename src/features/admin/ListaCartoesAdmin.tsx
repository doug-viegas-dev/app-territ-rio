import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import type { Cartao } from '@/domain/types'
import { useQuadras } from '@/features/cards/useCartao'
import { useCartoes } from '@/features/cards/useCartoes'
import CartaoForm from './CartaoForm'

function LinhaCartao({ cartao }: { cartao: Cartao }) {
  const quadras = useQuadras(cartao.id)
  const aberto = cartao.estado === 'aberto'
  const faltam = Math.max(0, cartao.totalCasas - cartao.resolvidas)
  const n = quadras.length
  return <Link className="linha-quadra simples" to={`/admin/cartao/${cartao.id}`}>
    <div>
      <h3>Cartão {cartao.numero} · {cartao.titulo}</h3>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--texto-suave)', flexWrap: 'wrap' }}>
        <Icone nome={aberto ? 'check' : 'cadeado'} className="ic ic-20" />
        <b>{aberto ? 'Aberto' : 'Fechado'}</b>
        <span>· {n} {n === 1 ? 'quadra' : 'quadras'} · {faltam === 0 ? 'Nenhuma casa falta' : `${faltam} ${faltam === 1 ? 'casa falta' : 'casas faltam'}`}</span>
      </span>
    </div>
    <Icone nome="chev" className="ic chev" />
  </Link>
}

export default function ListaCartoesAdmin() {
  const cartoes = useCartoes()
  const [aberta, setAberta] = useState(false)
  const [criado, setCriado] = useState<string | null>(null)
  const botao = useRef<HTMLButtonElement>(null)

  function fechar() {
    setAberta(false)
    botao.current?.focus()
  }

  function aoCriar(numero: string) {
    setCriado(numero)
    fechar()
  }

  return <>
    <h2 className="titulo-secao">Cartões</h2>
    {criado !== null && <div className="aviso" role="status" style={{ alignItems: 'center' }}>
      <Icone nome="check" />
      <p>Cartão {criado} criado.</p>
      <button type="button" className="btn suave medio auto" style={{ minHeight: 48, minWidth: 48 }} aria-label="Fechar mensagem" onClick={() => setCriado(null)}><Icone nome="fechar" className="ic ic-20" /></button>
    </div>}
    <button ref={botao} type="button" className="btn primario" style={{ marginBottom: 14 }} onClick={() => { setCriado(null); setAberta(true) }}><Icone nome="mais" className="ic ic-20" />Novo cartão</button>
    {cartoes?.map((c) => <LinhaCartao key={c.id} cartao={c} />)}
    {cartoes?.length === 0 && <p style={{ color: 'var(--texto-suave)' }}>Nenhum cartão ainda.</p>}
    {aberta && <div className="veu">
      <div className="folha" role="dialog" aria-label="Novo cartão">
        <CartaoForm onCriado={aoCriar} onCancelar={fechar} />
      </div>
    </div>}
  </>
}
