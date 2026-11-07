import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { demoAtivo, observarModoDemo, sairDaDemo, USUARIO_DEMO } from '@/demo/modo'
import { auth } from './app'

export type UsuarioAutenticado = { uid: string; email: string; nome: string }

export function entrarComGoogle(): Promise<void> {
  return signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined)
}

export function sair(): Promise<void> {
  if (demoAtivo()) { sairDaDemo(); return Promise.resolve() }
  return signOut(auth)
}

/** No modo demonstração o usuário é fictício e o Firebase fica de lado. */
export function observarUsuario(cb: (usuario: UsuarioAutenticado | null) => void): () => void {
  let real: UsuarioAutenticado | null = null
  const emitir = () => cb(demoAtivo() ? USUARIO_DEMO : real)
  const pararReal = onAuthStateChanged(auth, (usuario) => {
    real = usuario?.email ? {
      uid: usuario.uid,
      email: usuario.email,
      nome: usuario.displayName || usuario.email,
    } : null
    emitir()
  })
  const pararDemo = observarModoDemo(emitir)
  return () => { pararReal(); pararDemo() }
}
