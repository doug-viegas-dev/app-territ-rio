import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import type { Cartao, Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarQuadras } from '@/firebase/blocks'
import { criarCartao, observarCartoes } from '@/firebase/cards'
import { enviarArquivosDoCartao } from '@/firebase/storage'
import ListaCartoesAdmin from './ListaCartoesAdmin'

vi.mock('@/firebase/cards', () => ({ observarCartoes: vi.fn(), criarCartao: vi.fn(), atualizarCartao: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ enviarArquivosDoCartao: vi.fn() }))
vi.mock('./pdfParaImagem', () => ({ pdfParaImagem: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const cartoes: Cartao[] = [
  { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 30, resolvidas: 12, atualizadoEm: 0 },
  { id: 'c13', numero: '13', titulo: 'Bairro Novo', estado: 'fechado', ciclo: 1, totalCasas: 10, resolvidas: 10, atualizadoEm: 0 },
]
const quadra = (id: string): Quadra => ({ id, rotulo: id, ruas: [], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 0 })

function renderLista() {
  return render(<MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/admin" element={<ListaCartoesAdmin />} />
      <Route path="/admin/cartao/:cartaoId" element={<p>Tela do cartão</p>} />
    </Routes>
  </MemoryRouter>)
}

describe('ListaCartoesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(observarCartoes).mockImplementation((cb) => { cb(cartoes); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((id, cb) => { cb(id === 'c12' ? [quadra('q1'), quadra('q2'), quadra('q3')] : [quadra('q1')]); return () => {} })
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria Souza' }, membro: { papel: 'admin', ativo: true, nome: 'Maria S.' } })
    vi.mocked(criarCartao).mockResolvedValue('novo')
    vi.mocked(enviarArquivosDoCartao).mockResolvedValue({ pdfPath: 'a', imagemPath: 'b' })
  })
  afterEach(cleanup)

  it('lista os cartões com estado e casas que faltam', () => {
    renderLista()
    const aberto = screen.getByRole('link', { name: /Cartão 12/ })
    expect(within(aberto).getByText('Cartão 12 · Jardim')).toBeInTheDocument()
    expect(within(aberto).getByText('Aberto')).toBeInTheDocument()
    expect(within(aberto).getByText(/3 quadras/)).toBeInTheDocument()
    expect(within(aberto).getByText(/18 casas faltam/)).toBeInTheDocument()
    const fechado = screen.getByRole('link', { name: /Cartão 13/ })
    expect(within(fechado).getByText('Fechado')).toBeInTheDocument()
    expect(within(fechado).getByText(/1 quadra\b/)).toBeInTheDocument()
    expect(within(fechado).getByText(/Nenhuma casa falta/)).toBeInTheDocument()
  })

  it('Novo cartão abre a folha e o formulário não aparece antes', async () => {
    renderLista()
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Novo cartão' }))
    const folha = screen.getByRole('dialog', { name: 'Novo cartão' })
    expect(within(folha).getByLabelText('Título')).toBeInTheDocument()
  })

  it('Cancelar fecha a folha e devolve o foco ao botão', async () => {
    renderLista()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Novo cartão' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo cartão' })).toHaveFocus()
  })

  it('criar o cartão fecha a folha', async () => {
    renderLista()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Novo cartão' }))
    await user.type(screen.getByLabelText('Número'), '14')
    await user.type(screen.getByLabelText('Título'), 'Centro')
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(criarCartao).toHaveBeenCalledTimes(1)
  })

  it('se o mapa não sobe, a folha continua aberta com o aviso', async () => {
    const { pdfParaImagem } = await import('./pdfParaImagem')
    vi.mocked(pdfParaImagem).mockResolvedValue({ imagem: new Blob(['i']), paginas: 1 })
    vi.mocked(enviarArquivosDoCartao).mockRejectedValueOnce(new Error('rede'))
    renderLista()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Novo cartão' }))
    await user.type(screen.getByLabelText('Número'), '14')
    await user.type(screen.getByLabelText('Título'), 'Centro')
    await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), new File(['%PDF'], 'm.pdf', { type: 'application/pdf' }))
    await screen.findByText(/1 página/)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(await screen.findByText(/O cartão 14 foi criado, mas o mapa não foi enviado/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Novo cartão' })).toBeInTheDocument()
  })

  it('tocar numa linha navega para a tela do cartão', async () => {
    renderLista()
    expect(screen.getByRole('link', { name: /Cartão 12/ })).toHaveAttribute('href', '/admin/cartao/c12')
    await userEvent.setup().click(screen.getByRole('link', { name: /Cartão 12/ }))
    expect(screen.getByText('Tela do cartão')).toBeInTheDocument()
  })
})
