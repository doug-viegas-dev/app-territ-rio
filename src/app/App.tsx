import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { Sprite } from './icones'
import AppRoutes from './routes'
import { useTeclado } from './useTeclado'

export default function App() {
  useTeclado()
  return <>
    <Sprite />
    <AuthProvider>
      <RequerMembro>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RequerMembro>
    </AuthProvider>
  </>
}
