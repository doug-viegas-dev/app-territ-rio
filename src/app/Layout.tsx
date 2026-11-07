import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSessao } from '@/features/auth/AuthProvider'
import { sairDaDemo, useDemo } from '@/demo/modo'
import ErroDeLeitura from './ErroDeLeitura'
import { Icone } from './icones'

export default function Layout() {
  const { membro } = useSessao()
  const demo = useDemo()
  const { pathname } = useLocation()
  const comNav = pathname === '/' || pathname === '/admin'
  return <main className="app">
    {demo && <div className="demo-faixa" role="status">
      <p>Demonstração com dados fictícios. Nada é salvo.</p>
      <button type="button" onClick={sairDaDemo}>Sair</button>
    </div>}
    <ErroDeLeitura key={pathname}><Outlet /></ErroDeLeitura>
    {comNav && <nav className="nav" aria-label="Principal">
      <NavLink to="/" end><Icone nome="cartoes" />Cartões</NavLink>
      {membro?.papel === 'admin' && <NavLink to="/admin"><Icone nome="admin" />Administração</NavLink>}
    </nav>}
  </main>
}
