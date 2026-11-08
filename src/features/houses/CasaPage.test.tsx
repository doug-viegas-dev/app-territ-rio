import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao } from '@/firebase/cards'
import { editarCasa, excluirCasa, observarCasas, observarVisitas, registrarVisita } from '@/firebase/houses'
import type { Cartao, Casa, Quadra, Visita } from '@/domain/types'
import CasaPage from './CasaPage'

vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), observarVisitas: vi.fn(), registrarVisita: vi.fn(), editarCasa: vi.fn(), excluirCasa: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))

const aberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 0, atualizadoEm: 0 }
const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 2, rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em: Date.now() } }
const casaComNumero: Casa = { id: 'h1', rua: 'Rua das Acácias', numero: '112', descricao: 'muro baixo', ordem: 1, status: 'pendente', criadoEm: 1 }
const casaSemNumero: Casa = { id: 'h1', rua: 'Rua das Acácias', descricao: 'Casa verde, ao lado da padaria', ordem: 1, status: 'sem_resposta', ultimaVisitaEm: new Date(2026, 10, 2).getTime(), ultimoPor: 'Marcos S.', criadoEm: 1 }
const visitas: Visita[] = [
  { id: 'v2', status: 'sem_resposta', em: new Date(2026, 10, 2).getTime(), porUid: 'u9', porNome: 'Marcos S.', ciclo: 2 },
  { id: 'v1', status: 'falado', em: new Date(2026, 8, 18).getTime(), porUid: 'u8', porNome: 'Ana P.', ciclo: 1, obs: 'Pediu para voltar à tarde.' },
]

function preparar(casa: Casa, opcoes: { cartao?: Cartao; papel?: 'admin' | 'publicador'; visitas?: Visita[] } = {}) {
  vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(opcoes.cartao ?? aberto); return () => {} })
  vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([quadra]); return () => {} })
  vi.mocked(observarCasas).mockImplementation((_c, _q, cb) => { cb([casa]); return () => {} })
  vi.mocked(observarVisitas).mockImplementation((_c, _q, _h, cb) => { cb(opcoes.visitas ?? visitas); return () => {} })
  vi.mocked(useSessao).mockReturnValue({
    carregando: false,
    usuario: { uid: 'u1', email: 'maria@example.com', nome: 'Maria Souza' },
    membro: { papel: opcoes.papel ?? 'publicador', ativo: true, nome: 'Maria S.' },
  })
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/cartao/c12/quadra/q3/casa/h1']}>
      <Routes>
        <Route path="/cartao/:cartaoId/quadra/:quadraId/casa/:casaId" element={<CasaPage />} />
        <Route path="/cartao/:cartaoId" element={<p>Tela do cartão</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CasaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnline).mockReturnValue(true)
    vi.mocked(registrarVisita).mockResolvedValue()
    vi.mocked(editarCasa).mockResolvedValue()
  })
  afterEach(cleanup)

  it('sem rodada aberta os botões de status ficam bloqueados e nada é gravado', async () => {
    preparar(casaComNumero)
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([{ ...quadra, rodadaAtual: undefined }]); return () => {} })
    renderPagina()
    const botao = screen.getByRole('button', { name: 'Conversado' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(registrarVisita).not.toHaveBeenCalled()
  })

  it('lista o histórico na ordem recebida, com nome, data e ciclo', () => {
    preparar(casaComNumero)
    renderPagina()
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Não atendeu')
    expect(itens[0]).toHaveTextContent('02/11/2026 · Marcos S. · Ciclo 2')
    expect(itens[1]).toHaveTextContent('Conversado')
    expect(itens[1]).toHaveTextContent('18/09/2026 · Ana P. · Ciclo 1')
    expect(itens[1]).toHaveTextContent('Pediu para voltar à tarde.')
  })

  it('casa sem visitas mostra "Nenhuma visita ainda"', () => {
    preparar(casaComNumero, { visitas: [] })
    renderPagina()
    expect(screen.getByText(/Nenhuma visita ainda/)).toBeInTheDocument()
    expect(screen.getByText(/nenhuma visita neste ciclo/)).toBeInTheDocument()
  })

  it('registrar com observação envia a observação e limpa o campo', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Observação/), 'voltar à tarde')
    await user.click(screen.getByRole('button', { name: 'Conversado' }))
    expect(registrarVisita).toHaveBeenCalledTimes(1)
    expect(registrarVisita).toHaveBeenCalledWith({
      cartao: aberto, quadraId: 'q3', rodada: 2, casa: casaComNumero, novoStatus: 'falado', obs: 'voltar à tarde', usuario: { uid: 'u1', nome: 'Maria S.' },
    })
    expect(screen.getByLabelText(/^Observação/)).toHaveValue('')
  })

  it('registrar sem observação não envia obs', async () => {
    preparar(casaComNumero)
    renderPagina()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Estudo' }))
    expect(vi.mocked(registrarVisita).mock.calls[0][0].obs).toBeUndefined()
  })

  it('o botão do status atual aparece marcado', () => {
    preparar(casaSemNumero)
    renderPagina()
    expect(screen.getByRole('button', { name: 'Não atendeu' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('editar a descrição chama editarCasa', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Editar número e descrição' }))
    const folha = screen.getByRole('dialog', { name: 'Editar casa' })
    const desc = within(folha).getByLabelText('Descrição curta')
    await user.clear(desc)
    await user.type(desc, 'portão azul')
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(editarCasa).toHaveBeenCalledWith('c12', 'q3', 'h1', { numero: '112', descricao: 'portão azul' })
    expect(screen.queryByRole('dialog', { name: 'Editar casa' })).not.toBeInTheDocument()
  })

  it('remover número e descrição juntos é recusado', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Editar número e descrição' }))
    const folha = screen.getByRole('dialog', { name: 'Editar casa' })
    await user.clear(within(folha).getByLabelText(/^Número/))
    await user.clear(within(folha).getByLabelText('Descrição curta'))
    await user.click(within(folha).getByRole('button', { name: 'Salvar' }))
    expect(editarCasa).not.toHaveBeenCalled()
    expect(within(folha).getByRole('alert')).toHaveTextContent('Informe o número ou uma descrição.')
  })

  it('cartão fechado desativa os botões e mostra o aviso (publicador)', async () => {
    preparar(casaComNumero, { cartao: { ...aberto, estado: 'fechado' } })
    renderPagina()
    expect(screen.getByText('Cartão fechado')).toBeInTheDocument()
    expect(screen.getByText(/Só um administrador pode abrir o cartão/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir cartão' })).not.toBeInTheDocument()
    const botao = screen.getByRole('button', { name: 'Conversado' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(registrarVisita).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Editar número e descrição' })).not.toBeInTheDocument()
  })

  it('cartão fechado: o administrador vê o link "Abrir cartão"', () => {
    preparar(casaComNumero, { cartao: { ...aberto, estado: 'fechado' }, papel: 'admin' })
    renderPagina()
    expect(screen.getByRole('link', { name: 'Abrir cartão' })).toHaveAttribute('href', '/cartao/c12')
  })

  it('administrador exclui a casa depois de confirmar', async () => {
    preparar(casaComNumero, { papel: 'admin' })
    vi.mocked(excluirCasa).mockResolvedValue()
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Excluir casa' }))
    expect(excluirCasa).not.toHaveBeenCalled()
    const folha = screen.getByRole('dialog', { name: 'Excluir casa' })
    await user.click(within(folha).getByRole('button', { name: 'Excluir casa' }))
    expect(excluirCasa).toHaveBeenCalledWith('c12', 'q3', casaComNumero)
  })

  it('cancelar a confirmação não exclui', async () => {
    preparar(casaComNumero, { papel: 'admin' })
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Excluir casa' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(excluirCasa).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Excluir casa' })).not.toBeInTheDocument()
  })

  it('publicador não vê "Excluir casa"', () => {
    preparar(casaComNumero)
    renderPagina()
    expect(screen.queryByRole('button', { name: 'Excluir casa' })).not.toBeInTheDocument()
  })

  it('casa sem número mostra só a descrição e "Sem número"', () => {
    preparar(casaSemNumero)
    renderPagina()
    expect(screen.getByRole('heading', { name: 'Casa verde, ao lado da padaria' })).toBeInTheDocument()
    expect(screen.getByText('Sem número')).toBeInTheDocument()
  })
})
