import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

/**
 * Ao abrir, o Auth revalida o usuário pela rede e o Firestore espera esse passo terminar antes de ler o cache.
 * Em rede "fantasma" (Wi-Fi sem internet) a chamada fica pendurada ~30 s e o app inteiro espera.
 * Essas consultas de renovação passam a falhar rápido: o Auth trata como falta de rede e mantém o usuário salvo.
 */
const LIMITE_RENOVACAO_MS = 2_000
const ehRenovacaoDeSessao = (url: string) => /accounts:lookup|securetoken\.googleapis\.com/.test(url)
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = (entrada, init) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
    if (!ehRenovacaoDeSessao(url)) return fetchOriginal(entrada, init)
    return new Promise<Response>((resolver, rejeitar) => {
      const controle = new AbortController()
      const timer = setTimeout(() => { controle.abort(); rejeitar(new TypeError('Failed to fetch')) }, LIMITE_RENOVACAO_MS)
      init?.signal?.addEventListener('abort', () => controle.abort())
      fetchOriginal(entrada, { ...init, signal: controle.signal }).then(
        (r) => { clearTimeout(timer); resolver(r) },
        (e) => { clearTimeout(timer); rejeitar(e) },
      )
    })
  }
}

const app = getApps().length ? getApp() : initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  // Redes que bloqueiam QUIC/WebChannel derrubam o Firestore: troca sozinho para long polling.
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const storage = getStorage(app)

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  // As portas podem ser trocadas por variáveis de ambiente quando as padrões já estão em uso.
  const porta = (valor: string | undefined, padrao: number) => Number(valor) || padrao
  connectAuthEmulator(auth, `http://127.0.0.1:${porta(import.meta.env.VITE_AUTH_EMULATOR_PORT, 9099)}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', porta(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT, 8080))
  connectStorageEmulator(storage, '127.0.0.1', porta(import.meta.env.VITE_STORAGE_EMULATOR_PORT, 9199))
}
