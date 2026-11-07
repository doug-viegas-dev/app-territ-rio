import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { entrarNaDemo } from '@/demo/modo'
import LoginPage from './LoginPage'

vi.mock('@/firebase/auth', () => ({ entrarComGoogle: vi.fn() }))
vi.mock('@/demo/modo', () => ({ entrarNaDemo: vi.fn() }))

describe('LoginPage', () => {
  afterEach(cleanup)

  it('oferece a demonstração sem login', async () => {
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver demonstração' }))
    expect(entrarNaDemo).toHaveBeenCalledOnce()
  })
})
