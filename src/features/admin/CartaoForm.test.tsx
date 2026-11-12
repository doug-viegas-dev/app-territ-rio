import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartoes } from '@/features/cards/useCartoes'
import { atualizarCartao, criarCartao } from '@/firebase/cards'
import { enviarArquivosDoCartao } from '@/firebase/storage'
import CartaoForm from './CartaoForm'
import { pdfParaImagem } from './pdfParaImagem'

vi.mock('@/firebase/cards', () => ({ criarCartao: vi.fn(), atualizarCartao: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ enviarArquivosDoCartao: vi.fn() }))
vi.mock('./pdfParaImagem', () => ({ pdfParaImagem: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))
vi.mock('@/features/cards/useCartoes', () => ({ useCartoes: vi.fn() }))

const imagem = new Blob(['img'], { type: 'image/webp' })
const pdf = new File(['%PDF'], 'mapa-cartao-13.pdf', { type: 'application/pdf' })

async function preencher(user: ReturnType<typeof userEvent.setup>, comPdf: boolean) {
  await user.type(screen.getByLabelText('Número'), '13')
  await user.type(screen.getByLabelText('Título'), 'Bairro Novo')
  if (comPdf) await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
}

describe('CartaoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria Souza' }, membro: { papel: 'admin', ativo: true, nome: 'Maria S.' } })
    vi.mocked(useCartoes).mockReturnValue([{ id: 'x12', numero: '12', titulo: 'Outro', estado: 'fechado', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }])
    vi.mocked(pdfParaImagem).mockResolvedValue({ imagem, paginas: 3 })
    vi.mocked(criarCartao).mockResolvedValue('novo')
    vi.mocked(enviarArquivosDoCartao).mockResolvedValue({ pdfPath: 'cards/novo/mapa.pdf', imagemPath: 'cards/novo/mapa.webp' })
    vi.mocked(atualizarCartao).mockResolvedValue()
  })
  afterEach(cleanup)

  const renderForm = () => render(<MemoryRouter><CartaoForm /></MemoryRouter>)

  it('PDF com mais de uma página mostra o aviso "Só a primeira página será usada"', async () => {
    renderForm()
    await userEvent.setup().upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    expect(await screen.findByText(/Só a primeira página será usada/)).toBeInTheDocument()
    expect(screen.getByText(/3 páginas/)).toBeInTheDocument()
  })

  it('PDF de uma página não mostra o aviso', async () => {
    vi.mocked(pdfParaImagem).mockResolvedValue({ imagem, paginas: 1 })
    renderForm()
    await userEvent.setup().upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    expect(await screen.findByText(/1 página/)).toBeInTheDocument()
    expect(screen.queryByText(/Só a primeira página/)).not.toBeInTheDocument()
  })

  it('salvar chama criarCartao, enviarArquivosDoCartao e atualizarCartao, nessa ordem', async () => {
    renderForm()
    const user = userEvent.setup()
    await preencher(user, true)
    await screen.findByText(/Só a primeira página/)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await waitFor(() => expect(atualizarCartao).toHaveBeenCalled())
    expect(criarCartao).toHaveBeenCalledWith({ numero: '13', titulo: 'Bairro Novo' }, { uid: 'u1', nome: 'Maria S.' })
    expect(enviarArquivosDoCartao).toHaveBeenCalledWith('novo', { pdf, imagem })
    expect(atualizarCartao).toHaveBeenCalledWith('novo', { pdfPath: 'cards/novo/mapa.pdf', imagemPath: 'cards/novo/mapa.webp' })
    const ordem = [criarCartao, enviarArquivosDoCartao, atualizarCartao].map((f) => vi.mocked(f).mock.invocationCallOrder[0])
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
  })

  it('depois de criar, limpa os campos e não mostra mais o banner nem o link Ver cartão', async () => {
    renderForm()
    const user = userEvent.setup()
    await preencher(user, false)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await waitFor(() => expect(criarCartao).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByLabelText('Número')).toHaveValue(''))
    expect(screen.queryByText('Ver cartão')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cartão 13 criado/)).not.toBeInTheDocument()
    expect(enviarArquivosDoCartao).not.toHaveBeenCalled()
  })

  it('se o mapa falha depois de criar o cartão, tentar de novo não cria um cartão duplicado', async () => {
    vi.mocked(enviarArquivosDoCartao).mockRejectedValueOnce(new Error('rede'))
    renderForm()
    const user = userEvent.setup()
    await preencher(user, true)
    await screen.findByText(/Só a primeira página/)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(await screen.findByText(/O cartão 13 foi criado, mas o mapa não foi enviado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await waitFor(() => expect(atualizarCartao).toHaveBeenCalledWith('novo', expect.anything()))
    expect(criarCartao).toHaveBeenCalledTimes(1)
    expect(enviarArquivosDoCartao).toHaveBeenCalledTimes(2)
  })

  it('chama onCriado só quando tudo deu certo e onCancelar ao cancelar', async () => {
    vi.mocked(enviarArquivosDoCartao).mockRejectedValueOnce(new Error('rede'))
    const onCriado = vi.fn()
    const onCancelar = vi.fn()
    render(<MemoryRouter><CartaoForm onCriado={onCriado} onCancelar={onCancelar} /></MemoryRouter>)
    const user = userEvent.setup()
    await preencher(user, true)
    await screen.findByText(/Só a primeira página/)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await screen.findByText(/O cartão 13 foi criado, mas o mapa não foi enviado/)
    expect(onCriado).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    await waitFor(() => expect(onCriado).toHaveBeenCalledTimes(1))
    expect(onCriado).toHaveBeenCalledWith('13')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
  })

  it('sem número ou título não cria', async () => {
    renderForm()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(criarCartao).not.toHaveBeenCalled()
  })

  it('número repetido de outro cartão não cria', async () => {
    renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Número'), '12')
    await user.type(screen.getByLabelText('Título'), 'Novo')
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Já existe o cartão 12.')
    expect(criarCartao).not.toHaveBeenCalled()
  })

  it('PDF acima de 20 MB mostra o limite e não lê o arquivo', async () => {
    renderForm()
    const grande = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 20 * 1024 * 1024 + 1 })
    await userEvent.setup().upload(screen.getByLabelText('Arquivo PDF do mapa'), grande)
    expect(await screen.findByText('O arquivo passa de 20 MB. Escolha outro.')).toBeInTheDocument()
    expect(pdfParaImagem).not.toHaveBeenCalled()
  })

  it('link do Maps sem https:// não cria', async () => {
    renderForm()
    const user = userEvent.setup()
    await preencher(user, false)
    await user.type(screen.getByLabelText('Link do Google Maps'), 'maps.app/x')
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Cole o link completo, começando com https://.')
    expect(criarCartao).not.toHaveBeenCalled()
  })

  it('sem internet não cria', async () => {
    vi.mocked(useOnline).mockReturnValue(false)
    renderForm()
    const user = userEvent.setup()
    await preencher(user, false)
    await user.click(screen.getByRole('button', { name: 'Criar cartão' }))
    expect(criarCartao).not.toHaveBeenCalled()
    expect(screen.getByText(/Sem internet\. Conecte-se/)).toBeInTheDocument()
  })
})
