import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { validarCasa } from '@/domain/casa'
import { podeRegistrar } from '@/domain/ciclo'
import { rotuloStatus } from '@/domain/rotulos'
import type { Casa, Visita } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useOnline } from '@/app/useOnline'
import { useCartao, useQuadrasCarregadas } from '@/features/cards/useCartao'
import { aindaNoHistorico } from '@/domain/historico'
import { editarCasa, excluirCasa, marcarCasa, observarVisitas, salvarObservacao } from '@/firebase/houses'
import HistoricoVisitas from './HistoricoVisitas'
import { classeStatus, rotuloCasa } from './rotuloCasa'
import { SeloMarcas } from './SeloMarcas'
import { useCasas } from './useCasas'

const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function useVisitas(cartaoId: string, quadraId: string, casaId: string): Visita[] {
  const [atual, setAtual] = useState<{ chave: string; visitas: Visita[] } | null>(null)
  const chave = `${cartaoId}/${quadraId}/${casaId}`
  useEffect(() => observarVisitas(cartaoId, quadraId, casaId, (visitas) => {
    const agora = Date.now()
    setAtual({ chave, visitas: visitas.filter((v) => aindaNoHistorico(v, agora)) })
  }), [cartaoId, quadraId, casaId, chave])
  return atual?.chave === chave ? atual.visitas : []
}

function Interruptor({ rotulo, ligada, bloqueado, onClick }: { rotulo: string; ligada: boolean; bloqueado: boolean; onClick: () => void }) {
  return <button
    type="button"
    role="switch"
    aria-checked={ligada}
    aria-disabled={bloqueado ? true : undefined}
    className={ligada ? 'chave on' : 'chave'}
    style={{ minHeight: 48, width: '100%', justifyContent: 'space-between', textAlign: 'left' }}
    onClick={() => { if (!bloqueado) onClick() }}
  ><span>{rotulo}</span><i /></button>
}

function FolhaEditar({ casa, onSalvar, onCancelar, onExcluir }: { casa: Casa; onSalvar: (d: { numero: string; descricao: string }) => void; onCancelar: () => void; onExcluir?: () => void }) {
  const [numero, setNumero] = useState(casa.numero ?? '')
  const [descricao, setDescricao] = useState(casa.descricao ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const e = validarCasa({ numero, descricao })
    if (e) return setErro(e)
    onSalvar({ numero, descricao })
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Editar casa">
      <h2>Editar casa</h2>
      <div className="campo">
        <label htmlFor="editar-numero">Número <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>(opcional)</span></label>
        <input id="editar-numero" className="entrada" value={numero} onChange={(e) => { setNumero(e.target.value); setErro(null) }} />
      </div>
      <div className="campo">
        <label htmlFor="editar-descricao">Descrição curta</label>
        <input id="editar-descricao" className="entrada" value={descricao} onChange={(e) => { setDescricao(e.target.value); setErro(null) }} />
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={salvar}>Salvar</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
        {onExcluir && <button type="button" className="btn perigo" onClick={onExcluir}>Excluir casa</button>}
      </div>
    </div>
  </div>
}

export default function CasaPage() {
  const { cartaoId = '', quadraId = '', casaId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadrasCarregadas(cartaoId)
  const online = useOnline()
  const casas = useCasas(cartaoId, quadraId)
  const visitas = useVisitas(cartaoId, quadraId, casaId)
  const { usuario, membro } = useSessao()
  const [obs, setObs] = useState('')
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState<'edicao' | 'marca' | 'obs' | null>(null)
  const [confirmandoNaoVisitar, setConfirmandoNaoVisitar] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [enviandoExclusao, setEnviandoExclusao] = useState(false)
  const [erroExclusao, setErroExclusao] = useState(false)
  const navigate = useNavigate()

  const quadra = quadras?.find((q) => q.id === quadraId)
  const casa = casas?.find((c) => c.id === casaId)
  const voltar = { voltarPara: `/cartao/${cartaoId}/quadra/${quadraId}`, voltarRotulo: `Voltar para a ${quadra?.rotulo ?? 'quadra'}` }

  if (cartao === undefined || casas === null || quadras === null) return <>
    <Topo titulo="Casa" {...voltar} />
    <div className="rolagem"><Carregando /></div>
  </>
  if (cartao !== null && !quadra) return <>
    <Topo titulo="Casa" voltarPara={`/cartao/${cartaoId}`} voltarRotulo={`Voltar para o Cartão ${cartao.numero}`} />
    <div className="rolagem"><div className="sem-casas"><h2 style={{ fontSize: 22 }}>Quadra não encontrada</h2><p style={{ color: 'var(--texto-suave)' }}>Ela pode ter sido removida por outra pessoa.</p></div></div>
  </>
  if (cartao === null || !casa) return <>
    <Topo titulo="Casa" {...voltar} />
    <div className="rolagem"><div className="sem-casas"><h2 style={{ fontSize: 22 }}>Casa não encontrada</h2></div></div>
  </>

  const aberto = podeRegistrar(cartao)
  const ehAdmin = membro?.papel === 'admin'

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function marcar(marca: 'naoVisitar' | 'estudo', ligada: boolean) {
    if (!cartao || !casa || !usuario || !aberto) return
    setErro(null)
    marcarCasa({ cartaoId, quadraId, casa, marca, ligada, usuario: { uid: usuario.uid, nome: membro?.nome ?? usuario.nome }, quadraSemContadores: quadra?.semContadores === true }).catch(() => setErro('marca'))
  }

  function salvarObs() {
    const texto = obs.trim()
    if (!cartao || !usuario || !aberto || !texto) return
    setErro(null)
    salvarObservacao({ cartaoId, quadraId, casaId, ciclo: cartao.ciclo, texto, usuario: { uid: usuario.uid, nome: membro?.nome ?? usuario.nome } }).catch(() => {
      setErro('obs')
      setObs((atual) => (atual === '' ? obs : atual))
    })
    setObs('')
  }

  function salvarEdicao(d: { numero: string; descricao: string }) {
    setErro(null)
    editarCasa(cartaoId, quadraId, casaId, d).catch(() => setErro('edicao'))
    setEditando(false)
  }

  /** Online espera o resultado para mostrar a falha; offline a escrita só resolve com rede, então não espera. */
  async function excluir() {
    // Sem a quadra não dá para saber se ela tem contadores: não apaga a casa às cegas.
    if (!casa || !quadra || enviandoExclusao) return
    const escrita = excluirCasa(cartaoId, quadraId, casa, { quadraSemContadores: quadra.semContadores === true })
    if (online) {
      setEnviandoExclusao(true)
      setErroExclusao(false)
      try { await escrita } catch {
        setEnviandoExclusao(false)
        return setErroExclusao(true)
      }
    } else escrita.catch(() => {})
    navigate(voltar.voltarPara, { replace: true })
  }

  const nome = classeStatus(casa.status)
  return <>
    <Topo titulo="Casa" {...voltar} sub={`${quadra?.rotulo ?? 'Quadra'} · ${casa.rua}`} />
    {erro && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p>
        {erro === 'edicao'
          ? <><b>Não foi possível salvar a edição</b>O número e a descrição voltaram ao que estava. Tente de novo.</>
          : <><b>Não foi possível salvar</b>{erro === 'marca' ? 'A marca da casa não mudou.' : 'A observação não foi enviada.'} Tente de novo. <button type="button" className="btn link" style={{ minHeight: 48 }} onClick={() => setErro(null)}>Entendi</button></>}
      </p>
    </div>}
    {!aberto && <div className="aviso faixa" role="status">
      <Icone nome="cadeado" />
      <p>
        <b>Cartão fechado</b>
        {ehAdmin ? 'Abra o cartão para registrar. ' : 'Peça a um administrador para abrir.'}
        {ehAdmin && <Link className="btn link" style={{ minHeight: 48 }} to={`/cartao/${cartaoId}`}>Abrir cartão</Link>}
      </p>
    </div>}

    <div className="rolagem">
      <div className="painel-caixa" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', alignItems: 'start' }}>
        <div>
          <h2 style={{ fontSize: 24 }}>{rotuloCasa(casa)}</h2>
          {!casa.numero?.trim() && <p style={{ color: 'var(--texto-suave)' }}>Sem número</p>}
        </div>
        {aberto && <button type="button" className="btn suave medio auto" style={{ minHeight: 48, padding: '0 14px' }} aria-label="Editar número e descrição" onClick={() => setEditando(true)}><Icone nome="editar" className="ic ic-20" />Editar</button>}
        <div style={{ gridColumn: '1 / 3', marginTop: 6 }}>
          <span className={`estado c-${nome}`}>
            <Icone nome={nome} />{rotuloStatus(casa.status)}{' '}
            <small>· {casa.status === 'pendente' || casa.ultimaVisitaEm === undefined ? 'nenhuma visita ainda' : `${dia(casa.ultimaVisitaEm)}${casa.ultimoPor ? ` · ${casa.ultimoPor}` : ''}`}</small>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 4 }}><SeloMarcas casa={casa} /></div>

      <h2 className="titulo-secao" style={{ marginTop: 18 }}>Sobre esta casa</h2>
      <Interruptor rotulo="Pediu para não ser visitado" ligada={!!casa.naoVisitar} bloqueado={!aberto} onClick={() => (casa.naoVisitar ? marcar('naoVisitar', false) : setConfirmandoNaoVisitar(true))} />
      {casa.naoVisitar && (casa.naoVisitarPor || casa.naoVisitarEm !== undefined) && <p className="dica" style={{ color: 'var(--texto-suave)', margin: '2px 0 8px' }}>Marcado{casa.naoVisitarPor && ` por ${casa.naoVisitarPor}`}{casa.naoVisitarEm !== undefined && ` em ${dia(casa.naoVisitarEm)}`}</p>}
      <Interruptor rotulo="Aqui há um estudo de alguém" ligada={!!casa.estudo} bloqueado={!aberto} onClick={() => marcar('estudo', !casa.estudo)} />
      {casa.estudo && (casa.estudoPor || casa.estudoEm !== undefined) && <p className="dica" style={{ color: 'var(--texto-suave)', margin: '2px 0 8px' }}>Marcado{casa.estudoPor && ` por ${casa.estudoPor}`}{casa.estudoEm !== undefined && ` em ${dia(casa.estudoEm)}`}</p>}

      <div className="campo" style={{ marginTop: 18 }}>
        <label htmlFor="casa-obs">Observação <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>(opcional)</span></label>
        <textarea id="casa-obs" className="entrada" placeholder="Ex.: voltar à tarde" value={obs} onChange={(e) => setObs(e.target.value)} />
        <span className="dica">Não anote nomes, telefones nem documentos.</span>
        <button type="button" className="btn secundario" aria-disabled={aberto ? undefined : true} onClick={salvarObs}>Salvar</button>
      </div>

      <h2 className="titulo-secao divisor">Histórico</h2>
      <HistoricoVisitas visitas={visitas} />

    </div>

    {excluindo && <div className="veu">
      <div className="folha" role="dialog" aria-label="Excluir casa">
        <h2>Excluir esta casa?</h2>
        <p>{rotuloCasa(casa)} sai da lista e do total do cartão. O histórico de visitas dela não será mais exibido. Isso não pode ser desfeito.</p>
        {erroExclusao && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível excluir</b>Confira a conexão e tente de novo.</p></div>}
        <div className="pilha">
          <button type="button" className="btn perigo" disabled={enviandoExclusao} onClick={() => void excluir()}>{enviandoExclusao ? 'Excluindo…' : 'Excluir casa'}</button>
          <button type="button" className="btn secundario" onClick={() => { setExcluindo(false); setErroExclusao(false) }}>Cancelar</button>
        </div>
      </div>
    </div>}

    {confirmandoNaoVisitar && <div className="veu">
      <div className="folha" role="dialog" aria-label="Marcar como não visitar">
        <h2>Marcar como não visitar?</h2>
        <p>{rotuloCasa(casa)} sai das contas do cartão e da quadra, e o registro de visitas nela fica travado até você desmarcar.</p>
        <div className="pilha">
          <button type="button" className="btn primario" onClick={() => { setConfirmandoNaoVisitar(false); marcar('naoVisitar', true) }}>Marcar</button>
          <button type="button" className="btn secundario" onClick={() => setConfirmandoNaoVisitar(false)}>Cancelar</button>
        </div>
      </div>
    </div>}

    {editando && <FolhaEditar casa={casa} onSalvar={salvarEdicao} onCancelar={() => setEditando(false)} onExcluir={ehAdmin && aberto ? () => { if (!quadra) return; setEditando(false); setExcluindo(true) } : undefined} />}
  </>
}
