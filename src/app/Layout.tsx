import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSessao } from '@/features/auth/AuthProvider'
import { Icone } from './icones'

export default function Layout() {
  const { membro } = useSessao()
  const { pathname } = useLocation()
  const comNav = pathname === '/' || pathname === '/admin'
  return <main className="app">
    <Outlet />
    {comNav && <nav className="nav" aria-label="Principal">
      <NavLink to="/" end><Icone nome="cartoes" />Cartões</NavLink>
      {membro?.papel === 'admin' && <NavLink to="/admin"><Icone nome="admin" />Administração</NavLink>}
    </nav>}
  </main>
}
