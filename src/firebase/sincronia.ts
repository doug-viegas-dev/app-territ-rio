import { onSnapshotsInSync, waitForPendingWrites } from 'firebase/firestore'
import { db } from './app'
import { demoAtivo } from '@/demo/modo'

const ESPERA_MS = 400

/** Avisa `true` enquanto há escritas feitas neste aparelho que o servidor ainda não confirmou. */
export function observarSincronizando(cb: (pendente: boolean) => void): () => void {
  if (demoAtivo()) { cb(false); return () => {} }
  let vivo = true
  let rodada = 0
  const conferir = () => {
    const minha = ++rodada
    let resolvida = false
    // Se a confirmação demora mais que a espera, existe algo pendente.
    const timer = setTimeout(() => { if (vivo && !resolvida && minha === rodada) cb(true) }, ESPERA_MS)
    waitForPendingWrites(db).then(() => {
      resolvida = true
      clearTimeout(timer)
      if (vivo && minha === rodada) cb(false)
    }, () => clearTimeout(timer))
  }
  const parar = onSnapshotsInSync(db, conferir)
  conferir()
  return () => { vivo = false; parar() }
}
