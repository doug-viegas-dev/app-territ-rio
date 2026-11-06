import { useState } from 'react'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { useCartoes } from '@/features/cards/useCartoes'
import CartaoForm from './CartaoForm'
import CicloAdmin from './CicloAdmin'
import MembrosAdmin from './MembrosAdmin'
import QuadrasAdmin from './QuadrasAdmin'

function CicloDoCartao() {
  const cartoes = useCartoes()
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const cartao = cartoes?.find((c) => c.id === escolhido) ?? cartoes?.[0]
  if (!cartao) return <>
    <h2 className="titulo-secao divisor" id="ciclo">Ciclo</h2>
    <p style={{ color: 'var(--texto-suave)' }}>Crie um cartão para controlar o ciclo.</p>
  </>
  return <>
    {(cartoes?.length ?? 0) > 1 && <div className="chips" role="radiogroup" aria-label="Cartão do ciclo" style={{ marginTop: 24 }}>
      {cartoes?.map((c) => <button key={c.id} type="button" role="radio" aria-checked={c.id === cartao.id} className={c.id === cartao.id ? 'chip sel' : 'chip'} onClick={() => setEscolhido(c.id)}>
        {c.id === cartao.id && <Icone nome="check" className="ic ic-20" />}Cartão {c.numero}
      </button>)}
    </div>}
    <CicloAdmin key={cartao.id} cartao={cartao} />
  </>
}

const ABAS = [
  { id: 'membros', rotulo: 'Membros' },
  { id: 'cartoes', rotulo: 'Cartões' },
  { id: 'ciclo', rotulo: 'Ciclo' },
] as const
type AbaId = typeof ABAS[number]['id']

export default function AdminPage() {
  const [aba, setAba] = useState<AbaId>('membros')
  return <>
    <Topo titulo="Administração" />
    <div className="rolagem com-nav">
      <div className="segmento" style={{ marginBottom: 6 }} role="tablist" aria-label="Seções da administração">
        {ABAS.map((a) => <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-admin" className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>
      <div role="tabpanel" id="painel-admin" aria-labelledby={`aba-${aba}`}>
        {aba === 'membros' && <MembrosAdmin />}
        {aba === 'cartoes' && <>
          <CartaoForm />
          <QuadrasAdmin />
        </>}
        {aba === 'ciclo' && <CicloDoCartao />}
      </div>
    </div>
  </>
}
