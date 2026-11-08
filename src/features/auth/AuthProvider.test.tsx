import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { entrarComGoogle, observarUsuario, sair } from '@/firebase/auth'
import { observarMembro } from '@/firebase/members'
import { AuthProvider, RequerMembro } from './AuthProvider'

vi.mock('@/firebase/auth', () => ({
  entrarComGoogle: vi.fn(),
  sair: vi.fn(),
  observarUsuario: vi.fn(),
}))
vi.mock('@/firebase/members', () => ({ observarMembro: vi.fn() }))

const usuario = { uid: 'u1', email: 'maria@example.com', nome: 'Maria' }

function prepararSessao(membro: { papel: 'admin' | 'publicador'; ativo: boolean; nome: string } | null) {
  vi.mocked(observarUsuario).mockImplementation((cb) => {
    cb(usuario)
    return () => {}
  })
  vi.mocked(observarMembro).mockImplementation((_email, cb) => {
    cb(membro)
    return () => {}
  })
}

function renderProtegido(papel?: 'admin' | 'publicador') {
  return render(<AuthProvider><RequerMembro papel={papel}><p>Conteúdo protegido</p></RequerMembro></AuthProvider>)
}

describe('RequerMembro', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarUsuario).mockImplementation((cb) => {
      cb(null)
      return () => {}
    })
    vi.mocked(observarMembro).mockImplementation((_email, cb) => {
      cb(null)
      return () => {}
    })
  })

  it('oferece entrar com Google sem usuário', () => {
    renderProtegido()
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('aguarda liberação quando o usuário não tem membro', () => {
    prepararSessao(null)
    renderProtegido()
    expect(screen.getByRole('heading', { name: 'Aguardando liberação' })).toBeInTheDocument()
  })

  it('aguarda liberação para membro inativo', () => {
    prepararSessao({ papel: 'publicador', ativo: false, nome: 'Maria' })
    renderProtegido()
    expect(screen.getByRole('heading', { name: 'Aguardando liberação' })).toBeInTheDocument()
  })

  it('renderiza o conteúdo para membro ativo', () => {
    prepararSessao({ papel: 'publicador', ativo: true, nome: 'Maria' })
    renderProtegido()
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('não renderiza conteúdo de admin para publicador e avisa que é só para administradores', () => {
    prepararSessao({ papel: 'publicador', ativo: true, nome: 'Maria' })
    renderProtegido('admin')
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Só para administradores' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aguardando liberação' })).not.toBeInTheDocument()
  })

  it('mostra o esqueleto, e não tela em branco, enquanto carrega o membro', () => {
    vi.mocked(observarUsuario).mockImplementation((cb) => {
      cb(usuario)
      return () => {}
    })
    vi.mocked(observarMembro).mockImplementation(() => () => {})
    renderProtegido()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
  })

  it('depois de um tempo sem resposta do servidor, avisa que não conseguiu conectar em vez de carregar para sempre', () => {
    vi.useFakeTimers()
    try {
      vi.mocked(observarUsuario).mockImplementation((cb) => {
        cb(usuario)
        return () => {}
      })
      vi.mocked(observarMembro).mockImplementation(() => () => {})
      renderProtegido()
      expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(20_000) })
      expect(screen.getByRole('heading', { name: 'Sem conexão com o servidor' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Aguardando liberação' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('inicia a autenticação ao tocar em Entrar com Google', async () => {
    const user = userEvent.setup()
    renderProtegido()
    await user.click(screen.getByRole('button', { name: 'Entrar com Google' }))
    expect(entrarComGoogle).toHaveBeenCalledOnce()
  })

  it('encerra a sessão ao tocar em Sair', async () => {
    prepararSessao(null)
    const user = userEvent.setup()
    renderProtegido()
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(sair).toHaveBeenCalledOnce()
  })
})
