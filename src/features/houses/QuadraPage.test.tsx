import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao } from '@/firebase/cards'
import { observarCasas, registrarVisita } from '@/firebase/houses'
import type { Cartao, Casa, Quadra, Status } from '@/domain/types'
import QuadraPage from './QuadraPage'

vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), registrarVisita: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const cartaoAberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 8, resolvidas: 3, atualizadoEm: 0 }
const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'], ordem: 1 }
let n = 0
const casa = (p: Partial<Casa> & { status?: Status }): Casa => ({
  id: `h${++n}`, rua: 'Rua das Acácias', ordem: n, status: 'pendente', criadoEm: n, ...p,
})

function preparar(casas: Casa[], opcoes: { cartao?: Cartao; papel?: 'admin' | 'publicador' } = {}) {
  vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(opcoes.cartao ?? cartaoAberto); return () => {} })
  vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([quadra]); return () => {} })
  vi.mocked(observarCasas).mockImplementation((_c, _q, cb) => { cb(casas); return () => {} })
  vi.mocked(useSessao).mockReturnValue({
    carregando: false,
    usuario: { uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' },
    membro: { papel: opcoes.papel ?? 'publicador', ativo: true, nome: 'Maria S.' },
  })
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/cartao/c12/quadra/q3']}>
      <Routes>
        <Route path="/cartao/:cartaoId/quadra/:quadraId" element={<QuadraPage />} />
        <Route path="/cartao/:cartaoId" element={<p>Tela do cartão</p>} />
        <Route path="/cartao/:cartaoId/quadra/:quadraId/casa/:casaId" element={<p>Tela da casa</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const barra = () => screen.getByRole('region', { name: 'Registrar visita' })
const textos = (selector: string) => Array.from(document.querySelectorAll(selector)).map((e) => e.textContent)

describe('QuadraPage', () => {
  beforeEach(() => {
    n = 0
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(registrarVisita).mockResolvedValue()
  })
  afterEach(cleanup)

  it('mostra as casas na ordem recebida dentro da rua, mesmo que o número seja maior', () => {
    preparar([casa({ numero: '200', ordem: 1 }), casa({ numero: '100', ordem: 2 })])
    renderPagina()
    const rotulos = textos('.casa .rotulo')
    expect(rotulos.indexOf('200')).toBeLessThan(rotulos.indexOf('100'))
  })

  it('agrupa por rua, na ordem das ruas da quadra', () => {
    preparar([casa({ numero: '1', rua: 'Rua Ipê Amarelo' }), casa({ numero: '2', rua: 'Rua das Acácias' })])
    renderPagina()
    const ruas = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(ruas[0]).toMatch(/^Rua das Acácias/)
    expect(ruas[1]).toMatch(/^Rua Ipê Amarelo/)
  })

  it('duas casas com o mesmo número aparecem as duas', () => {
    preparar([casa({ numero: '120' }), casa({ numero: '120' })])
    renderPagina()
    expect(textos('.casa .rotulo').filter((t) => t === '120')).toHaveLength(2)
  })

  it('no modo Trabalho esconde as conversadas e põe estudo e não visitar em "Atenção"', () => {
    preparar([
      casa({ numero: '1', status: 'falado' }),
      casa({ numero: '2', status: 'pendente' }),
      casa({ numero: '3', status: 'estudo' }),
      casa({ numero: '4', status: 'nao_visitar' }),
    ])
    renderPagina()
    const rotulos = textos('.casa .rotulo')
    expect(rotulos.some((t) => t?.startsWith('1'))).toBe(false)
    const atencao = screen.getByRole('heading', { name: /Atenção/ })
    expect(atencao).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Detalhes|Estudo|Não visitar/ }).length).toBeGreaterThanOrEqual(2)
  })

  it('"Todas" mostra todas as casas, inclusive as conversadas', async () => {
    preparar([casa({ numero: '1', status: 'falado' }), casa({ numero: '2' })])
    renderPagina()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Todas' }))
    const rotulos = textos('.casa .rotulo')
    expect(rotulos).toContain('1')
    expect(rotulos).toContain('2')
  })

  it('tocar em "Conversado" registra uma vez, com o status e o usuário', async () => {
    const primeira = casa({ numero: '112', descricao: 'muro baixo' })
    preparar([primeira, casa({ numero: '116' })])
    renderPagina()
    expect(within(barra()).getByText('112 · muro baixo')).toBeInTheDocument()
    await userEvent.setup().click(within(barra()).getByRole('button', { name: 'Conversado' }))
    expect(registrarVisita).toHaveBeenCalledTimes(1)
    expect(registrarVisita).toHaveBeenCalledWith({
      cartao: cartaoAberto, quadraId: 'q3', casa: primeira, novoStatus: 'falado', usuario: { uid: 'u1', nome: 'Maria S.' },
    })
  })

  it('os quatro botões têm altura mínima de 48px', () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    const botoes = within(barra()).getAllByRole('button').filter((b) => ['Conversado', 'Não atendeu', 'Estudo', 'Não visitar'].includes(b.textContent ?? ''))
    expect(botoes).toHaveLength(4)
    for (const b of botoes) expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(48)
  })

  it('depois de registrar, o foco vai para a próxima casa da lista de trabalho', async () => {
    preparar([casa({ numero: '112' }), casa({ numero: '116' })])
    renderPagina()
    await userEvent.setup().click(within(barra()).getByRole('button', { name: 'Não atendeu' }))
    await waitFor(() => expect(within(barra()).getByText('116')).toBeInTheDocument())
  })

  it('tocar numa casa da lista passa o foco para ela', async () => {
    preparar([casa({ numero: '1' }), casa({ numero: '2' })])
    renderPagina()
    await userEvent.setup().click(screen.getByRole('button', { name: /^2/ }))
    expect(within(barra()).getByText('2')).toBeInTheDocument()
  })

  it('o botão do status atual aparece marcado', () => {
    preparar([casa({ numero: '1', status: 'estudo' })])
    renderPagina()
    expect(within(barra()).getByRole('button', { name: 'Estudo' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(barra()).getByRole('button', { name: 'Conversado' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('cartão fechado desativa os botões, não registra e esconde "+ casa"', async () => {
    preparar([casa({ numero: '1' })], { cartao: { ...cartaoAberto, estado: 'fechado' }, papel: 'publicador' })
    renderPagina()
    const botao = within(barra()).getByRole('button', { name: 'Conversado' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(registrarVisita).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Adicionar casa' })).not.toBeInTheDocument()
    expect(screen.getByText('Cartão fechado')).toBeInTheDocument()
    expect(screen.getByText('Só um administrador pode abrir o cartão. Peça a um deles.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir cartão' })).not.toBeInTheDocument()
  })

  it('cartão fechado: administrador vê o link "Abrir cartão"', () => {
    preparar([casa({ numero: '1' })], { cartao: { ...cartaoAberto, estado: 'fechado' }, papel: 'admin' })
    renderPagina()
    expect(screen.getByRole('link', { name: 'Abrir cartão' })).toHaveAttribute('href', '/cartao/c12')
  })

  it('cartão aberto mostra o botão "+ casa"', () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    expect(screen.getByRole('button', { name: 'Adicionar casa' })).toBeInTheDocument()
  })

  it('quadra sem casas mostra a orientação e "Cadastrar a primeira casa"', () => {
    preparar([])
    renderPagina()
    expect(screen.getByText('Nenhuma casa nesta quadra')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar a primeira casa' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Registrar visita' })).not.toBeInTheDocument()
  })

  it('erro de envio avisa e permite tentar de novo', async () => {
    vi.mocked(registrarVisita).mockRejectedValueOnce(new Error('falhou'))
    preparar([casa({ numero: '1' })])
    const user = userEvent.setup()
    renderPagina()
    await user.click(within(barra()).getByRole('button', { name: 'Conversado' }))
    expect(await screen.findByText('A última anotação não foi enviada')).toBeInTheDocument()
    expect(screen.getByText('Não enviado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(registrarVisita).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByText('A última anotação não foi enviada')).not.toBeInTheDocument())
  })

  it('sem internet mostra a faixa de aviso', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    preparar([casa({ numero: '1' })])
    renderPagina()
    expect(screen.getByText('Sem internet — suas anotações serão enviadas depois.')).toBeInTheDocument()
  })

  it('mostra o progresso da quadra no cabeçalho', () => {
    preparar([casa({ numero: '1', status: 'falado' }), casa({ numero: '2' }), casa({ numero: '3', status: 'nao_visitar' })])
    renderPagina()
    expect(screen.getByText(/2 de 3 resolvidas/)).toBeInTheDocument()
  })
})
