import { Route, Routes } from 'react-router-dom'
import { RequerMembro } from '@/features/auth/AuthProvider'
import CartaoPage from '@/features/cards/CartaoPage'
import CartoesPage from '@/features/cards/CartoesPage'
import CasaPage from '@/features/houses/CasaPage'
import AdminPage from '@/features/admin/AdminPage'
import HistoricoCartaoPage from '@/features/admin/HistoricoCartaoPage'
import QuadraPage from '@/features/houses/QuadraPage'
import Layout from './Layout'

export default function AppRoutes() {
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<CartoesPage />} />
      <Route path="cartao/:cartaoId" element={<CartaoPage />} />
      <Route path="cartao/:cartaoId/quadra/:quadraId" element={<QuadraPage />} />
      <Route path="cartao/:cartaoId/quadra/:quadraId/casa/:casaId" element={<CasaPage />} />
      <Route path="admin" element={<RequerMembro papel="admin"><AdminPage /></RequerMembro>} />
      <Route path="admin/cartao/:cartaoId/historico" element={<RequerMembro papel="admin"><HistoricoCartaoPage /></RequerMembro>} />
    </Route>
  </Routes>
}
