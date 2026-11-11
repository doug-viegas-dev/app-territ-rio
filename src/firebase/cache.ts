import { getDocFromCache, getDocsFromCache, onSnapshot, Timestamp, type DocumentReference, type DocumentSnapshot, type Query, type QuerySnapshot } from 'firebase/firestore'

/**
 * Cópia própria dos dados, no IndexedDB do aparelho. Aparece na hora, sem depender do Firebase
 * (o Firestore só lê o cache depois que o Auth termina de iniciar, o que em rede ruim demora).
 * O Firebase continua atualizando por cima e a cópia é regravada a cada resposta dele.
 */
const BANCO = 'territorio-local'
const LOJA = 'listas'

type DocSalvo = { id: string; data: Record<string, unknown> }
type Salvo = { docs: DocSalvo[] }

let banco: Promise<IDBDatabase | null> | null = null
function abrir(): Promise<IDBDatabase | null> {
  banco ??= new Promise((resolver) => {
    try {
      const req = indexedDB.open(BANCO, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(LOJA) }
      req.onsuccess = () => resolver(req.result)
      req.onerror = () => resolver(null)
      req.onblocked = () => resolver(null)
    } catch { resolver(null) }
  })
  return banco
}

async function operar<T>(modo: IDBTransactionMode, fn: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const bd = await abrir()
  if (!bd) return undefined
  return new Promise((resolver) => {
    try {
      const req = fn(bd.transaction(LOJA, modo).objectStore(LOJA))
      req.onsuccess = () => resolver(req.result)
      req.onerror = () => resolver(undefined)
    } catch { resolver(undefined) }
  })
}

// Timestamp perde a classe ao ser guardado: vira um marcador e volta a ser Timestamp na leitura.
const MARCA = '__ts'
function empacotar(v: unknown): unknown {
  if (v instanceof Timestamp) return { [MARCA]: [v.seconds, v.nanoseconds] }
  if (Array.isArray(v)) return v.map(empacotar)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, empacotar(x)]))
  return v
}
function desempacotar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(desempacotar)
  if (v && typeof v === 'object') {
    const marca = (v as Record<string, unknown>)[MARCA]
    if (Array.isArray(marca) && marca.length === 2) return new Timestamp(Number(marca[0]), Number(marca[1]))
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, desempacotar(x)]))
  }
  return v
}

export function guardarLista(chave: string, docs: { id: string; data: () => Record<string, unknown> }[]): void {
  const salvo: Salvo = { docs: docs.map((d) => ({ id: d.id, data: empacotar(d.data()) as Record<string, unknown> })) }
  void operar('readwrite', (l) => l.put(salvo, chave))
}

export function guardarDoc(chave: string, id: string, data: Record<string, unknown>): void {
  const salvo: Salvo = { docs: [{ id, data: empacotar(data) as Record<string, unknown> }] }
  void operar('readwrite', (l) => l.put(salvo, chave))
}

async function lerSalvo(chave: string): Promise<DocSalvo[] | null> {
  const salvo = await operar<Salvo | undefined>('readonly', (l) => l.get(chave) as IDBRequest<Salvo | undefined>)
  if (!salvo || !Array.isArray(salvo.docs)) return null
  return salvo.docs.map((d) => ({ id: d.id, data: desempacotar(d.data) as Record<string, unknown> }))
}

/** Apaga a cópia local (ao sair da conta). */
export function limparCopiaLocal(): void {
  void operar('readwrite', (l) => l.clear())
}

const instantaneoDeLista = (docs: DocSalvo[]) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  empty: docs.length === 0,
  size: docs.length,
  metadata: { fromCache: true, hasPendingWrites: false },
}) as unknown as QuerySnapshot

/**
 * Como `onSnapshot`, mas entrega na hora o que já está guardado neste aparelho (cópia própria e,
 * se ela não existir, o cache do Firestore). `chave` identifica a lista na cópia própria.
 */
export function ouvirComCache(
  chave: string,
  alvo: Query,
  aoReceber: (snap: QuerySnapshot) => void,
  onErro?: (e: Error) => void,
): () => void {
  let vivo = true
  let jaChegou = false
  const entregar = (snap: QuerySnapshot) => { if (vivo && !jaChegou && !snap.empty) aoReceber(snap) }
  void lerSalvo(chave).then((docs) => { if (docs) entregar(instantaneoDeLista(docs)) })
  getDocsFromCache(alvo).then(entregar, () => { /* sem cache: o onSnapshot cuida */ })
  const parar = onSnapshot(alvo, (snap) => {
    jaChegou = true
    if (!snap.metadata.fromCache || !snap.empty) guardarLista(chave, snap.docs)
    aoReceber(snap)
  }, onErro)
  return () => { vivo = false; parar() }
}

export function ouvirDocComCache(
  chave: string,
  alvo: DocumentReference,
  aoReceber: (snap: DocumentSnapshot) => void,
  onErro?: (e: Error) => void,
): () => void {
  let vivo = true
  let jaChegou = false
  const entregar = (snap: DocumentSnapshot) => { if (vivo && !jaChegou && snap.exists()) aoReceber(snap) }
  void lerSalvo(chave).then((docs) => {
    const d = docs?.[0]
    if (d) entregar({ id: d.id, exists: () => true, data: () => d.data, metadata: { fromCache: true } } as unknown as DocumentSnapshot)
  })
  getDocFromCache(alvo).then(entregar, () => { /* sem cache: o onSnapshot cuida */ })
  const parar = onSnapshot(alvo, (snap) => {
    jaChegou = true
    if (snap.exists()) guardarDoc(chave, snap.id, snap.data())
    aoReceber(snap)
  }, onErro)
  return () => { vivo = false; parar() }
}
