import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// As telas só observam a fila de escritas; nos testes de tela não há Firestore.
vi.mock('@/firebase/sincronia', () => ({ observarSincronizando: () => () => {} }))
