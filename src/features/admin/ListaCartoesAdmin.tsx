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
  const botao = useRef<HTMLButtonElement>(null)

  function fechar() {
    setAberta(false)
    botao.current?.focus()
  }

  return <>
    <h2 className="titulo-secao">Cartões</h2>
    <button ref={botao} type="button" className="btn primario" style={{ marginBottom: 14 }} onClick={() => setAberta(true)}><Icone nome="mais" className="ic ic-20" />Novo cartão</button>
    {cartoes?.map((c) => <LinhaCartao key={c.id} cartao={c} />)}
    {cartoes?.length === 0 && <p style={{ color: 'var(--texto-suave)' }}>Nenhum cartão ainda.</p>}
    {aberta && <div className="veu">
      <div className="folha" role="dialog" aria-label="Novo cartão">
        <CartaoForm onCriado={fechar} onCancelar={fechar} />
      </div>
    </div>}
  </>
}
