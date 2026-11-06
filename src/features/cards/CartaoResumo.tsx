import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { Progresso } from '@/app/Progresso'
import type { Cartao } from '@/domain/types'

export default function CartaoResumo({ cartao }: { cartao: Cartao }) {
  const fechado = cartao.estado !== 'aberto'
  return <Link className={fechado ? 'item-cartao fechado' : 'item-cartao'} to={`/cartao/${cartao.id}`}>
    <span className="num">{cartao.numero}</span>
    <div className="corpo">
      <h3>{cartao.titulo}</h3>
      {fechado && <span className="etiqueta"><Icone nome="cadeado" className="ic ic-20" />Fechado</span>}
    </div>
    <span className="conta">{cartao.resolvidas}/{cartao.totalCasas}</span>
    {!fechado && <Progresso claro resolvidas={cartao.resolvidas} total={cartao.totalCasas} />}
  </Link>
}
