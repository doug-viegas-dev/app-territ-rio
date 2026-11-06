import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, RequerMembro } from '@/features/auth/AuthProvider'
import { Sprite } from './icones'
import AppRoutes from './routes'

export default function App() {
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
