import Topo from '@/app/Topo'
import CartaoForm from './CartaoForm'
import MembrosAdmin from './MembrosAdmin'
import QuadrasAdmin from './QuadrasAdmin'

export default function AdminPage() {
  return <>
    <Topo titulo="Administração" />
    <div className="rolagem com-nav">
      <div className="segmento" style={{ marginBottom: 6 }}>
        <a className="ativo" href="#membros">Membros</a>
        <a href="#cartoes">Cartões</a>
      </div>
      <MembrosAdmin />
      <CartaoForm />
      <QuadrasAdmin />
    </div>
  </>
}
