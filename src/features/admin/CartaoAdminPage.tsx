import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { useCartao, useQuadrasCarregadas } from '@/features/cards/useCartao'
import EstadoCartao from './EstadoCartao'
import QuadrasAdmin from './QuadrasAdmin'

function Bloco({ titulo, aberto, children }: { titulo: string; aberto?: boolean; children: ReactNode }) {
  return <details className="bloco" open={aberto}>
    <summary><span>{titulo}</span><Icone nome="chev" className="ic bloco-seta" /></summary>
    <div className="bloco-corpo">{children}</div>
  </details>
}

export default function CartaoAdminPage() {
  const { cartaoId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadrasCarregadas(cartaoId)
  const topo = (titulo: string, sub?: string) => <Topo titulo={titulo} voltarPara="/admin" voltarRotulo="Voltar para Cartões" sub={sub} />

  if (cartao === undefined) return <>
    {topo('Cartão')}
    <div className="rolagem"><Carregando /></div>
  </>

  if (cartao === null) return <>
    {topo('Cartão')}
    <div className="rolagem"><div className="sem-casas">
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Cartão não encontrado</h2>
      <p style={{ color: 'var(--texto-suave)' }}>Ele pode ter sido removido. Volte para a lista de cartões.</p>
    </div></div>
  </>

  return <>
    {topo(`Cartão ${cartao.numero}`, cartao.titulo)}
    <div className="rolagem">
      <Bloco titulo="Estado" aberto><EstadoCartao cartao={cartao} quadras={quadras} /></Bloco>
      <Bloco titulo="Quadras e ruas"><QuadrasAdmin cartao={cartao} /></Bloco>
      <Bloco titulo="Histórico">
        <Link className="btn suave medio" to={`/admin/cartao/${cartao.id}/historico`}>
          <Icone nome="historico" className="ic ic-20" />Ver quando foi aberto e fechado
        </Link>
      </Bloco>
    </div>
  </>
}
