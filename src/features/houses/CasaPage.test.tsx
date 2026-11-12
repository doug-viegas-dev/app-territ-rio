import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarQuadras } from '@/firebase/blocks'
import { observarCartao } from '@/firebase/cards'
import { editarCasa, excluirCasa, marcarCasa, observarCasas, observarVisitas, salvarObservacao } from '@/firebase/houses'
import { abrirRodada } from '@/firebase/rodadas'
import type { Cartao, Casa, Quadra, Visita } from '@/domain/types'
import CasaPage from './CasaPage'

vi.mock('@/firebase/cards', () => ({ observarCartao: vi.fn() }))
vi.mock('@/firebase/blocks', () => ({ observarQuadras: vi.fn() }))
vi.mock('@/firebase/houses', () => ({ observarCasas: vi.fn(), observarVisitas: vi.fn(), marcarCasa: vi.fn(), salvarObservacao: vi.fn(), editarCasa: vi.fn(), excluirCasa: vi.fn() }))
vi.mock('@/app/useOnline', () => ({ useOnline: vi.fn() }))
vi.mock('@/features/auth/AuthProvider', () => ({ useSessao: vi.fn() }))
vi.mock('@/firebase/rodadas', () => ({ abrirRodada: vi.fn(), encerrarRodada: vi.fn() }))

const aberto: Cartao = { id: 'c12', numero: '12', titulo: 'Jardim', estado: 'aberto', ciclo: 2, totalCasas: 3, resolvidas: 0, atualizadoEm: 0 }
const quadra: Quadra = { id: 'q3', rotulo: 'Quadra 3', ruas: ['Rua das Acácias'], ordem: 1, totalCasas: 0, faltam: 0, rodadasTotal: 2, rodadaAtual: { id: 'r2', numero: 2, porNome: 'Ana', em: Date.now() } }
const casaComNumero: Casa = { id: 'h1', rua: 'Rua das Acácias', numero: '112', descricao: 'muro baixo', ordem: 1, status: 'pendente', criadoEm: 1 }
const casaSemNumero: Casa = { id: 'h1', rua: 'Rua das Acácias', descricao: 'Casa verde, ao lado da padaria', ordem: 1, status: 'sem_resposta', ultimaVisitaEm: new Date(2026, 10, 2).getTime(), ultimoPor: 'Marcos S.', criadoEm: 1 }
const visitas: Visita[] = [
  { id: 'v2', status: 'sem_resposta', em: new Date(2026, 10, 2).getTime(), porUid: 'u9', porNome: 'Marcos S.', ciclo: 2, rodada: 2 },
  { id: 'v1', status: 'falado', em: new Date(2026, 8, 18).getTime(), porUid: 'u8', porNome: 'Ana P.', ciclo: 1, rodada: 1, obs: 'Pediu para voltar à tarde.' },
]

function preparar(casa: Casa, opcoes: { cartao?: Cartao; papel?: 'admin' | 'publicador'; visitas?: Visita[]; quadra?: Quadra } = {}) {
  vi.mocked(observarCartao).mockImplementation((_id, cb) => { cb(opcoes.cartao ?? aberto); return () => {} })
  vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([opcoes.quadra ?? quadra]); return () => {} })
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
    vi.mocked(marcarCasa).mockResolvedValue()
    vi.mocked(salvarObservacao).mockResolvedValue()
    vi.mocked(editarCasa).mockResolvedValue()
  })
  afterEach(cleanup)

  it('lista o histórico na ordem recebida, com nome, data e volta', () => {
    preparar(casaComNumero)
    renderPagina()
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Não atendeu')
    expect(itens[0]).toHaveTextContent('02/11/2026 · Marcos S. · Volta 2')
    expect(itens[1]).toHaveTextContent('Conversado')
    expect(itens[1]).toHaveTextContent('18/09/2026 · Ana P. · Volta 1')
    expect(screen.queryByText(/Ciclo/)).not.toBeInTheDocument()
    expect(itens[1]).toHaveTextContent('Pediu para voltar à tarde.')
  })

  it('visita antiga sem rodada não mostra Volta nem Ciclo', () => {
    preparar(casaComNumero, { visitas: [{ id: 'v0', status: 'falado', em: new Date(2026, 8, 18).getTime(), porUid: 'u8', porNome: 'Ana P.', ciclo: 1 }] })
    renderPagina()
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('18/09/2026 · Ana P.')
    expect(item).not.toHaveTextContent('Volta')
    expect(item).not.toHaveTextContent('Ciclo')
  })

  it('casa sem visitas mostra "Nenhuma visita ainda"', () => {
    preparar(casaComNumero, { visitas: [] })
    renderPagina()
    expect(screen.getByText(/Nenhuma visita ainda/)).toBeInTheDocument()
    expect(screen.getByText(/nenhuma visita ainda/)).toBeInTheDocument()
  })

  it('mostra a faixa da rodada; sem rodada, "Nenhuma rodada aberta" e o botão "Abrir rodada"', async () => {
    vi.mocked(abrirRodada).mockResolvedValue()
    const semRodada = { ...quadra, rodadaAtual: undefined }
    preparar(casaComNumero, { quadra: semRodada })
    renderPagina()
    expect(screen.getByText('Nenhuma rodada aberta')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir rodada' }))
    expect(abrirRodada).toHaveBeenCalledWith('c12', semRodada, { uid: 'u1', nome: 'Maria S.' })
    cleanup()
    preparar(casaComNumero)
    renderPagina()
    expect(screen.getByRole('button', { name: 'Encerrar rodada' })).toBeInTheDocument()
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
    expect(excluirCasa).toHaveBeenCalledWith('c12', 'q3', casaComNumero, { quadraSemContadores: false })
  })

  it('sem a quadra carregada, Excluir casa fica desativado e não abre a confirmação nem grava', async () => {
    preparar(casaComNumero, { papel: 'admin' })
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { cb([]); return () => {} })
    renderPagina()
    const botao = screen.getByRole('button', { name: 'Excluir casa' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(botao)
    expect(screen.queryByRole('dialog', { name: 'Excluir casa' })).not.toBeInTheDocument()
    expect(excluirCasa).not.toHaveBeenCalled()
  })

  it('se a quadra some com a confirmação aberta, confirmar a exclusão não grava', async () => {
    preparar(casaComNumero, { papel: 'admin' })
    let enviarQuadras: (q: Quadra[]) => void = () => {}
    vi.mocked(observarQuadras).mockImplementation((_id, cb) => { enviarQuadras = cb; cb([quadra]); return () => {} })
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Excluir casa' }))
    act(() => enviarQuadras([]))
    await user.click(within(screen.getByRole('dialog', { name: 'Excluir casa' })).getByRole('button', { name: 'Excluir casa' }))
    expect(excluirCasa).not.toHaveBeenCalled()
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

  it('não tem região "Registrar visita", botões de registro nem o texto antigo da observação', () => {
    preparar(casaComNumero)
    renderPagina()
    expect(screen.queryByText('Registrar visita')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conversado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Carta' })).not.toBeInTheDocument()
    expect(screen.queryByText(/A observação vai junto com o próximo registro/)).not.toBeInTheDocument()
  })

  it('"Sobre esta casa" tem dois interruptores coerentes com as marcas', () => {
    preparar({ ...casaComNumero, estudo: true })
    renderPagina()
    expect(screen.getByText('Sobre esta casa')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Pediu para não ser visitado' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Aqui há um estudo de alguém' })).toHaveAttribute('aria-checked', 'true')
    cleanup()
    preparar({ ...casaComNumero, naoVisitar: true })
    renderPagina()
    expect(screen.getByRole('switch', { name: 'Pediu para não ser visitado' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Aqui há um estudo de alguém' })).toHaveAttribute('aria-checked', 'false')
  })

  it('marca sem autor nem data não quebra a tela', () => {
    preparar({ ...casaComNumero, naoVisitar: true })
    renderPagina()
    expect(screen.getAllByText('Não visitar').length).toBeGreaterThan(0)
  })

  it('ligar "estudo" chama marcarCasa sem confirmação', async () => {
    preparar(casaComNumero)
    renderPagina()
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Aqui há um estudo de alguém' }))
    expect(marcarCasa).toHaveBeenCalledTimes(1)
    expect(marcarCasa).toHaveBeenCalledWith(expect.objectContaining({ cartaoId: 'c12', quadraId: 'q3', casa: casaComNumero, marca: 'estudo', ligada: true, usuario: { uid: 'u1', nome: 'Maria S.' } }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ligar "não visitar" pede confirmação; só "Marcar" grava e "Cancelar" não', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('switch', { name: 'Pediu para não ser visitado' }))
    const dialogo = screen.getByRole('dialog', { name: 'Marcar como não visitar' })
    expect(dialogo).toHaveTextContent(/sai das contas/)
    expect(dialogo).toHaveTextContent(/registro/)
    expect(marcarCasa).not.toHaveBeenCalled()
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(marcarCasa).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Pediu para não ser visitado' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Marcar como não visitar' })).getByRole('button', { name: 'Marcar' }))
    expect(marcarCasa).toHaveBeenCalledTimes(1)
    expect(marcarCasa).toHaveBeenCalledWith(expect.objectContaining({ marca: 'naoVisitar', ligada: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('desligar "não visitar" não pede confirmação', async () => {
    preparar({ ...casaComNumero, naoVisitar: true })
    renderPagina()
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Pediu para não ser visitado' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(marcarCasa).toHaveBeenCalledWith(expect.objectContaining({ marca: 'naoVisitar', ligada: false }))
  })

  it('falha ao gravar a marca mostra o aviso de erro', async () => {
    vi.mocked(marcarCasa).mockRejectedValueOnce(new Error('falhou'))
    preparar(casaComNumero)
    renderPagina()
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Aqui há um estudo de alguém' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  })

  it('cartão fechado: interruptores e "Salvar" ficam desativados e não gravam', async () => {
    preparar(casaComNumero, { cartao: { ...aberto, estado: 'fechado' } })
    renderPagina()
    expect(screen.getByText('Cartão fechado')).toBeInTheDocument()
    const user = userEvent.setup()
    const estudo = screen.getByRole('switch', { name: 'Aqui há um estudo de alguém' })
    const nao = screen.getByRole('switch', { name: 'Pediu para não ser visitado' })
    const salvar = screen.getByRole('button', { name: 'Salvar' })
    for (const b of [estudo, nao, salvar]) expect(b).toHaveAttribute('aria-disabled', 'true')
    await user.type(screen.getByLabelText(/^Observação/), 'algo')
    await user.click(estudo)
    await user.click(nao)
    await user.click(salvar)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(marcarCasa).not.toHaveBeenCalled()
    expect(salvarObservacao).not.toHaveBeenCalled()
  })

  it('o aviso de dados pessoais aparece acima do campo Observação', () => {
    preparar(casaComNumero)
    renderPagina()
    const aviso = screen.getByText('Não anote nenhum dado pessoal: nem nomes, telefones ou documentos de moradores.')
    const campo = screen.getByLabelText(/^Observação/)
    expect(aviso.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('"Salvar" com texto vazio ou só espaços não grava', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await user.type(screen.getByLabelText(/^Observação/), '   ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(salvarObservacao).not.toHaveBeenCalled()
  })

  it('"Salvar" com texto grava a observação no ciclo do cartão e limpa o campo', async () => {
    preparar(casaComNumero)
    renderPagina()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Observação/), 'voltar à tarde')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(salvarObservacao).toHaveBeenCalledWith({ cartaoId: 'c12', quadraId: 'q3', casaId: 'h1', texto: 'voltar à tarde', ciclo: 2, usuario: { uid: 'u1', nome: 'Maria S.' } })
    expect(screen.getByLabelText(/^Observação/)).toHaveValue('')
  })

  it('o histórico não mostra visita de mais de 2 anos e mostra a de 1 ano', () => {
    const ano = 365 * 24 * 3600 * 1000
    preparar(casaComNumero, { visitas: [
      { id: 'novo', status: 'falado', em: Date.now() - ano, porUid: 'u', porNome: 'Recente R.', ciclo: 1 },
      { id: 'velho', status: 'falado', em: Date.now() - 3 * ano, porUid: 'u', porNome: 'Antigo A.', ciclo: 1 },
    ] })
    renderPagina()
    expect(screen.getByText(/Recente R\./)).toBeInTheDocument()
    expect(screen.queryByText(/Antigo A\./)).not.toBeInTheDocument()
  })

  it('casa sem número mostra só a descrição e "Sem número"', () => {
    preparar(casaSemNumero)
    renderPagina()
    expect(screen.getByRole('heading', { name: 'Casa verde, ao lado da padaria' })).toBeInTheDocument()
    expect(screen.getByText('Sem número')).toBeInTheDocument()
  })
})
