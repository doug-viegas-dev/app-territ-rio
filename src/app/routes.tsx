import { Route, Routes } from 'react-router-dom'
import { RequerMembro } from '@/features/auth/AuthProvider'
import CartaoPage from '@/features/cards/CartaoPage'
import CartoesPage from '@/features/cards/CartoesPage'
import CasaPage from '@/features/houses/CasaPage'
import QuadraPage from '@/features/houses/QuadraPage'
import Layout from './Layout'
import Topo from './Topo'

// Telas das próximas tarefas (14) entram no lugar destes espaços.
function EmBreve({ titulo }: { titulo: string }) {
  return <>
    <Topo titulo={titulo} voltarPara="/" />
    <div className="rolagem"><p>Esta tela ainda não está pronta.</p></div>
  </>
}

export default function AppRoutes() {
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<CartoesPage />} />
      <Route path="cartao/:cartaoId" element={<CartaoPage />} />
      <Route path="cartao/:cartaoId/quadra/:quadraId" element={<QuadraPage />} />
      <Route path="cartao/:cartaoId/quadra/:quadraId/casa/:casaId" element={<CasaPage />} />
      <Route path="admin" element={<RequerMembro papel="admin"><EmBreve titulo="Administração" /></RequerMembro>} />
    </Route>
  </Routes>
}
