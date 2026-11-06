import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from './app'

export type UsuarioAutenticado = { uid: string; email: string; nome: string }

export function entrarComGoogle(): Promise<void> {
  return signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined)
}

export function sair(): Promise<void> {
  return signOut(auth)
}

export function observarUsuario(cb: (usuario: UsuarioAutenticado | null) => void): () => void {
  return onAuthStateChanged(auth, (usuario) => {
    cb(usuario?.email ? {
      uid: usuario.uid,
      email: usuario.email,
      nome: usuario.displayName || usuario.email,
    } : null)
  })
}
