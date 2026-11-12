import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import type { Cartao } from '@/domain/types'
import { useCartoes } from '@/features/cards/useCartoes'
import { atualizarCartao } from '@/firebase/cards'
import { apagarArquivos, enviarArquivosDoCartao } from '@/firebase/storage'
import { EditarCartao } from './EditarCartao'
import { pdfParaImagem } from './pdfParaImagem'

vi.mock('@/firebase/cards', () => ({ atualizarCartao: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ enviarArquivosDoCartao: vi.fn(), apagarArquivos: vi.fn() }))
vi.mock('./pdfParaImagem', () => ({ pdfParaImagem: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/cards/useCartoes', () => ({ useCartoes: vi.fn() }))

const cartao: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', mapsUrl: 'https://maps.app/x', pdfPath: 'cards/c12/antigo.pdf', imagemPath: 'cards/c12/antigo.webp', estado: 'fechado', ciclo: 1, totalCasas: 0, resolvidas: 0, atualizadoEm: 0 }
const imagem = new Blob(['img'], { type: 'image/webp' })
const pdf = new File(['%PDF'], 'novo.pdf', { type: 'application/pdf' })

describe('EditarCartao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(useCartoes).mockReturnValue([cartao, { ...cartao, id: 'c13', numero: '13' }])
    vi.mocked(pdfParaImagem).mockResolvedValue({ imagem, paginas: 1 })
    vi.mocked(atualizarCartao).mockResolvedValue()
    vi.mocked(apagarArquivos).mockResolvedValue()
    vi.mocked(enviarArquivosDoCartao).mockResolvedValue({ pdfPath: 'cards/c12/novo.pdf', imagemPath: 'cards/c12/novo.webp' })
  })
  afterEach(cleanup)

  it('abre com número, título e link preenchidos', () => {
    render(<EditarCartao cartao={cartao} />)
    expect(screen.getByLabelText('Número')).toHaveValue('12')
    expect(screen.getByLabelText('Título')).toHaveValue('Jardim')
    expect(screen.getByLabelText('Link do Google Maps')).toHaveValue('https://maps.app/x')
  })

  it('salvar sem PDF chama atualizarCartao e mostra "Dados salvos."', async () => {
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), 'Jardim Novo')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(atualizarCartao).toHaveBeenCalledWith('c12', { numero: '12', titulo: 'Jardim Novo', mapsUrl: 'https://maps.app/x' })
    expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos.')
    expect(enviarArquivosDoCartao).not.toHaveBeenCalled()
  })

  it('link apagado envia mapsUrl: null', async () => {
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Link do Google Maps'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(atualizarCartao).toHaveBeenCalledWith('c12', { numero: '12', titulo: 'Jardim', mapsUrl: null })
  })

  it('o próprio número não conta como repetido; o de outro cartão sim', async () => {
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(atualizarCartao).toHaveBeenCalledTimes(1)
    await user.clear(screen.getByLabelText('Número'))
    await user.type(screen.getByLabelText('Número'), '13')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Já existe o cartão 13.')
    expect(atualizarCartao).toHaveBeenCalledTimes(1)
  })

  it('trocar o PDF: envia, grava os caminhos novos e só então apaga os antigos', async () => {
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    await screen.findByText('novo.pdf')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(apagarArquivos).toHaveBeenCalled())
    expect(enviarArquivosDoCartao).toHaveBeenCalledWith('c12', { pdf, imagem })
    expect(atualizarCartao).toHaveBeenCalledWith('c12', { numero: '12', titulo: 'Jardim', mapsUrl: 'https://maps.app/x', pdfPath: 'cards/c12/novo.pdf', imagemPath: 'cards/c12/novo.webp' })
    expect(apagarArquivos).toHaveBeenCalledWith(['cards/c12/antigo.pdf', 'cards/c12/antigo.webp'])
    const ordem = [enviarArquivosDoCartao, atualizarCartao, apagarArquivos].map((f) => vi.mocked(f).mock.invocationCallOrder[0])
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
    expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos.')
  })

  it('se o envio falha, não grava, não apaga e o mapa antigo continua valendo', async () => {
    vi.mocked(enviarArquivosDoCartao).mockRejectedValue(new Error('rede'))
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    await screen.findByText('novo.pdf')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível trocar o mapa. O mapa antigo continua valendo.')
    expect(atualizarCartao).not.toHaveBeenCalled()
    expect(apagarArquivos).not.toHaveBeenCalled()
  })

  it('se só a limpeza dos arquivos antigos falha, o resultado é de sucesso', async () => {
    vi.mocked(apagarArquivos).mockRejectedValue(new Error('x'))
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    await screen.findByText('novo.pdf')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sem internet, trocar o mapa fica aria-disabled com aviso e salvar sem PDF continua permitido', async () => {
    vi.mocked(useOnline).mockReturnValue(false)
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: /Trocar arquivo|Escolher arquivo/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Precisa de internet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(atualizarCartao).toHaveBeenCalledTimes(1)
  })

  it('segundo toque durante o envio não duplica a chamada', async () => {
    let soltar: (v: { pdfPath: string; imagemPath: string }) => void = () => {}
    vi.mocked(enviarArquivosDoCartao).mockReturnValue(new Promise((r) => { soltar = r }))
    render(<EditarCartao cartao={cartao} />)
    const user = userEvent.setup()
    await user.upload(screen.getByLabelText('Arquivo PDF do mapa'), pdf)
    await screen.findByText('novo.pdf')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await user.click(screen.getByRole('button', { name: 'Salvando…' }))
    expect(enviarArquivosDoCartao).toHaveBeenCalledTimes(1)
    soltar({ pdfPath: 'a', imagemPath: 'b' })
    await waitFor(() => expect(atualizarCartao).toHaveBeenCalledTimes(1))
  })
})
