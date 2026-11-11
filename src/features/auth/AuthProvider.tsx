import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { USUARIO_DEMO } from '@/demo/modo'
import { lerSessaoSalva, limparSessaoSalva, salvarSessao } from './sessaoSalva'
import { observarUsuario, type UsuarioAutenticado } from '@/firebase/auth'
import { observarMembro, type MembroObservado } from '@/firebase/members'
import { baixarTudo } from '@/firebase/offline'
import type { Papel } from '@/domain/types'
import LoginPage from './LoginPage'
import { TelaCarregando } from '@/app/Carregando'
import AguardandoLiberacao from './AguardandoLiberacao'
import SoAdministradores from './SoAdministradores'
import SemConexaoServidor from './SemConexaoServidor'

const TEMPO_SEM_RESPOSTA_MS = 15_000

type Sessao = { carregando: boolean; semResposta?: boolean; usuario: UsuarioAutenticado | null; membro: MembroObservado | null }
const SessaoContext = createContext<Sessao | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Com sessão salva o app abre na hora (sem esqueleto); a resposta do servidor corrige depois.
  const [salva] = useState(lerSessaoSalva)
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(salva?.usuario ?? null)
  const [membro, setMembro] = useState<MembroObservado | null>(salva?.membro ?? null)
  const [carregando, setCarregando] = useState(!salva)
  const [semResposta, setSemResposta] = useState(false)
  const uidAtual = useRef<string | null>(salva?.usuario.uid ?? null)

  useEffect(() => observarUsuario((atual) => {
    if (atual && atual.uid === uidAtual.current) {
      // Mesmo usuário que já está na tela (sessão salva confirmada): não volta ao esqueleto.
      setUsuario(atual)
      return
    }
    uidAtual.current = atual?.uid ?? null
    if (!atual) limparSessaoSalva()
    setUsuario(atual)
    setMembro(null)
    setCarregando(Boolean(atual))
    setSemResposta(false)
  }), [])

  // Se o servidor não responder, não deixa o esqueleto para sempre.
  useEffect(() => {
    if (!carregando || !usuario) return
    const t = setTimeout(() => setSemResposta(true), TEMPO_SEM_RESPOSTA_MS)
    return () => clearTimeout(t)
  }, [carregando, usuario])

  useEffect(() => {
    if (!usuario?.email) return
    const dono = usuario
    return observarMembro(dono.email, (atual) => {
      if (dono.uid !== USUARIO_DEMO.uid) salvarSessao(dono, atual)
      setMembro(atual)
      setCarregando(false)
      setSemResposta(false)
    })
  }, [usuario?.email])

  // Com acesso liberado e rede, guarda tudo no aparelho para o app abrir completo sem internet.
  const ativo = membro?.ativo === true
  const admin = membro?.papel === 'admin'
  useEffect(() => {
    if (!ativo) return
    const baixar = (forcar = false) => { if (navigator.onLine) void baixarTudo({ admin }, forcar) }
    baixar()
    const aoVoltar = () => baixar(true)
    const aoMostrar = () => { if (document.visibilityState === 'visible') baixar() }
    window.addEventListener('online', aoVoltar)
    document.addEventListener('visibilitychange', aoMostrar)
    return () => {
      window.removeEventListener('online', aoVoltar)
      document.removeEventListener('visibilitychange', aoMostrar)
    }
  }, [ativo, admin])

  return <SessaoContext.Provider value={{ carregando, semResposta, usuario, membro }}>{children}</SessaoContext.Provider>
}

export function useSessao(): Sessao {
  const sessao = useContext(SessaoContext)
  if (!sessao) throw new Error('useSessao deve ser usado dentro de AuthProvider')
  return sessao
}

export function RequerMembro({ papel, children }: { papel?: Papel; children: ReactNode }) {
  const { carregando, semResposta, usuario, membro } = useSessao()
  if (carregando && semResposta && usuario) return <SemConexaoServidor email={usuario.email} />
  if (carregando) return <TelaCarregando />
  if (!usuario) return <LoginPage />
  if (!membro?.ativo) return <AguardandoLiberacao email={usuario.email} />
  if (papel && membro.papel !== papel) return <SoAdministradores />
  return children
}
