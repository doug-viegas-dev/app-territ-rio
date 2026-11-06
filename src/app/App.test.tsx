import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import App from './App'

vi.mock('@/firebase/auth', () => ({
  entrarComGoogle: vi.fn(),
  sair: vi.fn(),
  observarUsuario: (cb: (u: null) => void) => { cb(null); return () => {} },
}))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))
vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), observarCartao: vi.fn(), abrirCartaoManual: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ urlDaImagem: vi.fn() }))

test('mostra o nome do aplicativo', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Meu Território' })).toBeTruthy()
})
