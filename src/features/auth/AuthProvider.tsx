import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { observarUsuario, type UsuarioAutenticado } from '@/firebase/auth'
import { observarMembro, type MembroObservado } from '@/firebase/members'
import type { Papel } from '@/domain/types'
import LoginPage from './LoginPage'
import { TelaCarregando } from '@/app/Carregando'
import AguardandoLiberacao from './AguardandoLiberacao'
import SoAdministradores from './SoAdministradores'

type Sessao = { carregando: boolean; usuario: UsuarioAutenticado | null; membro: MembroObservado | null }
const SessaoContext = createContext<Sessao | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [membro, setMembro] = useState<MembroObservado | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => observarUsuario((atual) => {
    setUsuario(atual)
    setMembro(null)
    setCarregando(Boolean(atual))
  }), [])

  useEffect(() => {
    if (!usuario?.email) return
    return observarMembro(usuario.email, (atual) => {
      setMembro(atual)
      setCarregando(false)
    })
  }, [usuario?.email])

  return <SessaoContext.Provider value={{ carregando, usuario, membro }}>{children}</SessaoContext.Provider>
}

export function useSessao(): Sessao {
  const sessao = useContext(SessaoContext)
  if (!sessao) throw new Error('useSessao deve ser usado dentro de AuthProvider')
  return sessao
}

export function RequerMembro({ papel, children }: { papel?: Papel; children: ReactNode }) {
  const { carregando, usuario, membro } = useSessao()
  if (carregando) return <TelaCarregando />
  if (!usuario) return <LoginPage />
  if (!membro?.ativo) return <AguardandoLiberacao email={usuario.email} />
  if (papel && membro.papel !== papel) return <SoAdministradores />
  return children
}
