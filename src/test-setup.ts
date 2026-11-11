import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

// A sessão salva neste aparelho não pode vazar de um teste para o outro.
beforeEach(() => { window.localStorage.clear() })

// As telas só observam a fila de escritas; nos testes de tela não há Firestore.
vi.mock('@/firebase/sincronia', () => ({ observarSincronizando: () => () => {} }))
vi.mock('@/firebase/offline', () => ({ baixarTudo: () => Promise.resolve() }))
