import Carregando from '@/app/Carregando'
import Topo from '@/app/Topo'
import CartaoResumo from './CartaoResumo'
import { useCartoes } from './useCartoes'

const contagem = (n: number) => `${n} ${n === 1 ? 'cartão' : 'cartões'}`

export default function CartoesPage() {
  const cartoes = useCartoes()
  const abertos = cartoes?.filter((c) => c.estado === 'aberto') ?? []
  const fechados = cartoes?.filter((c) => c.estado !== 'aberto') ?? []
  return <>
    <Topo titulo="Cartões" logo />
    <div className="rolagem com-nav">
      {cartoes === null && <Carregando />}
      {cartoes?.length === 0 && <div className="sem-casas">
        <svg width="72" height="72" viewBox="0 0 192 192" aria-hidden="true" style={{ margin: '0 auto 14px', display: 'block' }}><use href="#i-logo" /></svg>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Nenhum cartão ainda</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto 20px' }}>O administrador cria os cartões. Quando houver algum, ele aparece aqui.</p>
      </div>}
      {abertos.length > 0 && <>
        <h2 className="titulo-secao">Em andamento <small>{contagem(abertos.length)}</small></h2>
        {abertos.map((c) => <CartaoResumo key={c.id} cartao={c} />)}
      </>}
      {fechados.length > 0 && <>
        <h2 className={abertos.length > 0 ? 'titulo-secao divisor' : 'titulo-secao'}>Fechados <small>{contagem(fechados.length)}</small></h2>
        {fechados.map((c) => <CartaoResumo key={c.id} cartao={c} />)}
      </>}
    </div>
  </>
}
