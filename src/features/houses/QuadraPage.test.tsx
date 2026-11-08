import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
vi.mock('@/firebase/rodadas', () => ({ abrirRodada: vi.fn(), encerrarRodada: vi.fn() }))

const cartaoAberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 1, totalCasas: 8, resolvidas: 3, atualizadoEm: 0 }
const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias', 'Rua Ipê Amarelo'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 2, rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em: Date.now() } }
const quadraSemRodada: Quadra = { ...quadra, rodadaAtual: undefined }
let n = 0
const casa = (p: Partial<Casa> & { status?: Status }): Casa => ({
  id: `h${++n}`, rua: 'Rua das Acácias', ordem: n, status: 'pendente', criadoEm: n, ...p,
})

function preparar(casas: Casa[], opcoes: { cartao?: Cartao; papel?: 'admin' | 'publicador'; quadra?: Quadra } = {}) {
  vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(opcoes.cartao ?? cartaoAberto); return () => {} })
  vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([opcoes.quadra ?? quadra]); return () => {} })
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

describe('QuadraPage sem rede e sem cache da quadra', () => {
  afterEach(() => cleanup())
  it('não mostra "Nenhuma casa" nem convida a cadastrar: a lista vazia veio só do cache', () => {
    vi.mocked(useOnline).mockReturnValue(false)
    vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(cartaoAberto); return () => {} })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([quadra]); return () => {} })
    vi.mocked(observarCasas).mockImplementation((_c, _q, cb) => { cb([], true); return () => {} })
    vi.mocked(useSessao).mockReturnValue({ carregando: false, usuario: { uid: 'u1', email: 'm@x.com', nome: 'Maria' }, membro: { papel: 'publicador', ativo: true, nome: 'Maria S.' } })
    renderPagina()
    expect(screen.getByText('Esta quadra não está neste aparelho')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma casa nesta quadra')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cadastrar a primeira casa/ })).not.toBeInTheDocument()
  })
})

const barra = () => screen.getByRole('region', { name: 'Registrar visita' })
const textos = (selector: string) => Array.from(document.querySelectorAll(selector)).map((e) => e.textContent)

describe('QuadraPage', () => {
  it('"+ casa" abre o cadastro; quadra vazia oferece "Cadastrar a primeira casa"', async () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Adicionar casa' }))
    expect(screen.getByRole('dialog', { name: 'Nova casa' })).toBeInTheDocument()
    cleanup()
    preparar([])
    renderPagina()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cadastrar a primeira casa' }))
    expect(screen.getByRole('dialog', { name: 'Nova casa' })).toBeInTheDocument()
  })

  it('o botão de adicionar casa mostra só o ícone e tem nome acessível', () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    const botao = screen.getByRole('button', { name: 'Adicionar casa' })
    expect(botao.textContent).toBe('')
    expect(botao.querySelector('use')?.getAttribute('href')).toBe('#i-casa-mais')
  })

  it('só existe alça de arrastar depois de tocar em "Reordenar"; "Concluir" volta à quadra', async () => {
    preparar([casa({ numero: '100' }), casa({ numero: '104' })])
    renderPagina()
    const user = userEvent.setup()
    expect(screen.queryByLabelText(/^Arrastar /)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reordenar' }))
    expect(screen.getAllByLabelText(/^Arrastar /)).toHaveLength(2)
    expect(screen.queryByRole('region', { name: 'Registrar visita' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(screen.queryByLabelText(/^Arrastar /)).not.toBeInTheDocument()
    expect(barra()).toBeInTheDocument()
  })

  it('"Adicionar depois desta" abre o cadastro dentro do modo reordenar', async () => {
    preparar([casa({ numero: '100' }), casa({ numero: '104' })])
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reordenar' }))
    await user.click(screen.getByRole('button', { name: /^100/ }))
    await user.click(screen.getByRole('button', { name: 'Adicionar depois desta' }))
    expect(screen.getByRole('dialog', { name: 'Nova casa' })).toBeInTheDocument()
  })

  it('cartão fechado não oferece "Reordenar"', () => {
    preparar([casa({ numero: '1' })], { cartao: { ...cartaoAberto, estado: 'fechado' } })
    renderPagina()
    expect(screen.queryByRole('button', { name: 'Reordenar' })).not.toBeInTheDocument()
  })

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
      cartao: cartaoAberto, quadraId: 'q3', rodada: 2, casa: primeira, novoStatus: 'falado', usuario: { uid: 'u1', nome: 'Maria S.' }, quadraSemContadores: false,
    })
  })

  it('quadra sem contadores registra avisando para não mexer nos contadores da quadra', async () => {
    preparar([casa({ numero: '1' })], { quadra: { ...quadra, semContadores: true } })
    renderPagina()
    await userEvent.setup().click(within(barra()).getByRole('button', { name: 'Conversado' }))
    expect(vi.mocked(registrarVisita).mock.calls[0][0].quadraSemContadores).toBe(true)
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

  it('se a rodada encerra depois da falha, troca "Tentar de novo" por uma explicação', async () => {
    vi.mocked(registrarVisita).mockRejectedValueOnce(new Error('falhou'))
    let emitir: (q: Quadra[]) => void = () => {}
    preparar([casa({ numero: '1' })])
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { emitir = cb; cb([quadra]); return () => {} })
    renderPagina()
    await userEvent.setup().click(within(barra()).getByRole('button', { name: 'Conversado' }))
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    act(() => emitir([quadraSemRodada]))
    expect(screen.getByText('A última anotação não foi enviada')).toBeInTheDocument()
    expect(screen.getByText('A rodada foi encerrada. Abra a rodada para registrar de novo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('se o cartão fecha depois da falha, explica em vez de oferecer "Tentar de novo"', async () => {
    vi.mocked(registrarVisita).mockRejectedValueOnce(new Error('falhou'))
    let emitir: (c: Cartao | null) => void = () => {}
    preparar([casa({ numero: '1' })])
    vi.mocked(observarCartao).mockImplementation((_id, cb) => { emitir = cb; cb(cartaoAberto); return () => {} })
    renderPagina()
    await userEvent.setup().click(within(barra()).getByRole('button', { name: 'Conversado' }))
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    act(() => emitir({ ...cartaoAberto, estado: 'fechado' }))
    expect(screen.getByText('O cartão foi fechado. Um administrador precisa abri-lo para registrar de novo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
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

describe('QuadraPage com rodadas', () => {
  beforeEach(() => {
    n = 0
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(registrarVisita).mockResolvedValue()
  })
  afterEach(cleanup)

  it('mostra a faixa da rodada aberta', () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    expect(screen.getByText(/^Rodada 2 · aberta por Ana às /)).toBeInTheDocument()
  })

  it('sem rodada aberta os botões de status ficam bloqueados', async () => {
    preparar([casa({ numero: '1' })], { quadra: quadraSemRodada })
    renderPagina()
    expect(screen.getByText('Nenhuma rodada aberta')).toBeInTheDocument()
    const botao = within(barra()).getByRole('button', { name: 'Conversado' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(registrarVisita).not.toHaveBeenCalled()
  })

  it('com rodada aberta registrar a visita grava a rodada', async () => {
    preparar([casa({ numero: '1' })])
    renderPagina()
    const botao = within(barra()).getByRole('button', { name: 'Não atendeu' })
    expect(botao).not.toHaveAttribute('aria-disabled')
    await userEvent.setup().click(botao)
    expect(registrarVisita).toHaveBeenCalledWith(expect.objectContaining({ rodada: 2, novoStatus: 'sem_resposta' }))
  })

  it('Nada para visitar nesta quadra com atalho para Todas quando só restam casas resolvidas', async () => {
    preparar([casa({ numero: '1', status: 'falado' }), casa({ numero: '2', status: 'falado' })])
    renderPagina()
    expect(screen.getByText('Nada para visitar nesta quadra')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver todas as casas' }))
    expect(screen.getByRole('tab', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true')
    expect(textos('.casa .rotulo')).toContain('1')
  })

  it('Trabalho continua mostrando Atenção para Estudo e Não visitar', () => {
    preparar([casa({ numero: '1' }), casa({ numero: '3', status: 'estudo' }), casa({ numero: '4', status: 'nao_visitar' })])
    renderPagina()
    expect(screen.getByRole('heading', { name: /Atenção/ })).toBeInTheDocument()
    expect(screen.queryByText('Nada para visitar nesta quadra')).not.toBeInTheDocument()
  })
})
