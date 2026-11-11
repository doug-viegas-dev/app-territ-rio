import { getDocFromCache, getDocsFromCache, onSnapshot, type DocumentReference, type DocumentSnapshot, type Query, type QuerySnapshot } from 'firebase/firestore'

/**
 * Como `onSnapshot`, mas entrega na hora o que já está guardado neste aparelho.
 * Sem isso, com a rede ruim o Firestore espera até ~10 s antes de mostrar o cache.
 */
export function ouvirComCache(
  alvo: Query,
  aoReceber: (snap: QuerySnapshot) => void,
  onErro?: (e: Error) => void,
): () => void {
  let vivo = true
  let jaChegou = false
  getDocsFromCache(alvo).then((snap) => {
    if (vivo && !jaChegou && !snap.empty) aoReceber(snap)
  }, () => { /* sem cache: o onSnapshot cuida */ })
  const parar = onSnapshot(alvo, (snap) => { jaChegou = true; aoReceber(snap) }, onErro)
  return () => { vivo = false; parar() }
}

export function ouvirDocComCache(
  alvo: DocumentReference,
  aoReceber: (snap: DocumentSnapshot) => void,
  onErro?: (e: Error) => void,
): () => void {
  let vivo = true
  let jaChegou = false
  getDocFromCache(alvo).then((snap) => {
    if (vivo && !jaChegou && snap.exists()) aoReceber(snap)
  }, () => { /* sem cache: o onSnapshot cuida */ })
  const parar = onSnapshot(alvo, (snap) => { jaChegou = true; aoReceber(snap) }, onErro)
  return () => { vivo = false; parar() }
}
