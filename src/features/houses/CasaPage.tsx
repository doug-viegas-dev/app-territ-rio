import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { validarCasa } from '@/domain/casa'
import { podeRegistrar } from '@/domain/ciclo'
import { podeRegistrarNaQuadra } from '@/domain/rodada'
import { rotuloStatus } from '@/domain/rotulos'
import type { Casa, Status, Visita } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartao, useQuadras } from '@/features/cards/useCartao'
import { editarCasa, excluirCasa, observarVisitas, registrarVisita } from '@/firebase/houses'
import AvisoNaoEnviado from './AvisoNaoEnviado'
import FaixaRodada from './FaixaRodada'
import HistoricoVisitas from './HistoricoVisitas'
import { classeStatus, rotuloCasa } from './rotuloCasa'
import { useCasas } from './useCasas'

const STATUS_REGISTRAVEIS: Status[] = ['falado', 'sem_resposta', 'estudo', 'nao_visitar']
const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function useVisitas(cartaoId: string, quadraId: string, casaId: string): Visita[] {
  const [atual, setAtual] = useState<{ chave: string; visitas: Visita[] } | null>(null)
  const chave = `${cartaoId}/${quadraId}/${casaId}`
  useEffect(() => observarVisitas(cartaoId, quadraId, casaId, (visitas) => setAtual({ chave, visitas })), [cartaoId, quadraId, casaId, chave])
  return atual?.chave === chave ? atual.visitas : []
}

function FolhaEditar({ casa, onSalvar, onCancelar }: { casa: Casa; onSalvar: (d: { numero: string; descricao: string }) => void; onCancelar: () => void }) {
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
      </div>
    </div>
  </div>
}

export default function CasaPage() {
  const { cartaoId = '', quadraId = '', casaId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadras(cartaoId)
  const casas = useCasas(cartaoId, quadraId)
  const visitas = useVisitas(cartaoId, quadraId, casaId)
  const { usuario, membro } = useSessao()
  const [obs, setObs] = useState('')
  const [editando, setEditando] = useState(false)
  const [erroEdicao, setErroEdicao] = useState(false)
  const [erroRodada, setErroRodada] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const navigate = useNavigate()
  const [falha, setFalha] = useState<{ casa: Casa; novoStatus: Status; obs: string } | null>(null)

  const quadra = quadras.find((q) => q.id === quadraId)
  const casa = casas?.find((c) => c.id === casaId)
  const voltar = { voltarPara: `/cartao/${cartaoId}/quadra/${quadraId}`, voltarRotulo: `Voltar para a ${quadra?.rotulo ?? 'quadra'}` }

  if (cartao === undefined || casas === null) return <>
    <Topo titulo="Casa" {...voltar} />
    <div className="rolagem"><Carregando /></div>
  </>
  if (cartao === null || !casa) return <>
    <Topo titulo="Casa" {...voltar} />
    <div className="rolagem"><div className="sem-casas"><h2 style={{ fontSize: 22 }}>Casa não encontrada</h2></div></div>
  </>

  const aberto = podeRegistrar(cartao)
  const podeAnotar = !!quadra && podeRegistrarNaQuadra(cartao, quadra)
  const ehAdmin = membro?.papel === 'admin'

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function enviar(novoStatus: Status, texto: string) {
    const rodada = quadra?.rodadaAtual?.numero
    if (!cartao || !casa || !usuario || !quadra || rodada === undefined || !podeRegistrarNaQuadra(cartao, quadra)) return
    setFalha(null)
    registrarVisita({ cartao, quadraId, rodada, casa, novoStatus, ...(texto.trim() && { obs: texto.trim() }), usuario: { uid: usuario.uid, nome: membro?.nome ?? usuario.nome }, quadraSemContadores: quadra.semContadores === true })
      .catch(() => setFalha({ casa, novoStatus, obs: texto }))
  }

  function registrar(s: Status) {
    if (!podeAnotar) return
    enviar(s, obs)
    setObs('')
  }

  function salvarEdicao(d: { numero: string; descricao: string }) {
    setErroEdicao(false)
    editarCasa(cartaoId, quadraId, casaId, d).catch(() => setErroEdicao(true))
    setEditando(false)
  }

  /** Não espera a escrita: offline ela só resolve com rede. */
  function excluir() {
    // Sem a quadra não dá para saber se ela tem contadores: não apaga a casa às cegas.
    if (!casa || !quadra) return
    excluirCasa(cartaoId, quadraId, casa, { quadraSemContadores: quadra.semContadores === true }).catch(() => {})
    navigate(voltar.voltarPara, { replace: true })
  }

  const nome = classeStatus(casa.status)
  return <>
    <Topo titulo="Casa" {...voltar} sub={`${quadra?.rotulo ?? 'Quadra'} · ${casa.rua}`} naoEnviado={falha !== null} />
    {falha && <AvisoNaoEnviado cartaoAberto={aberto} rodadaAberta={!!quadra?.rodadaAtual} onTentar={() => enviar(falha.novoStatus, falha.obs)} />}
    {erroEdicao && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p><b>Não foi possível salvar a edição</b>O número e a descrição voltaram ao que estava. Tente de novo.</p>
    </div>}
    {erroRodada && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p><b>Não foi possível salvar</b>A rodada não mudou. Tente de novo. <button type="button" className="btn link" style={{ minHeight: 40 }} onClick={() => setErroRodada(false)}>Entendi</button></p>
    </div>}
    {quadra && <FaixaRodada cartaoId={cartaoId} quadra={quadra} cartaoAberto={aberto} onErro={() => setErroRodada(true)} />}
    {!aberto && <div className="aviso faixa" role="status">
      <Icone nome="cadeado" />
      <p>
        <b>Cartão fechado</b>
        {ehAdmin ? 'Abra o cartão para registrar visitas. ' : 'Só um administrador pode abrir o cartão. Peça a um deles.'}
        {ehAdmin && <Link className="btn link" style={{ minHeight: 40 }} to={`/cartao/${cartaoId}`}>Abrir cartão</Link>}
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

      <h2 className="titulo-secao" style={{ marginTop: 4 }}>Registrar visita</h2>
      <div className="grade-status">
        {STATUS_REGISTRAVEIS.map((s) => {
          const atual = casa.status === s
          const n = classeStatus(s)
          return <button
            key={s}
            type="button"
            className={`bs c-${n}${atual ? ' sel' : ''}`}
            style={{ minHeight: 56 }}
            aria-pressed={atual}
            aria-disabled={podeAnotar ? undefined : true}
            onClick={() => registrar(s)}
          ><Icone nome={n} /><span>{rotuloStatus(s)}</span></button>
        })}
      </div>

      <div className="campo" style={{ marginTop: 18 }}>
        <label htmlFor="casa-obs">Observação <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>(opcional)</span></label>
        <textarea id="casa-obs" className="entrada" placeholder="Ex.: voltar à tarde" value={obs} onChange={(e) => setObs(e.target.value)} />
        <span className="dica">Não escreva nomes de moradores. A observação vai junto com o próximo registro.</span>
      </div>

      <h2 className="titulo-secao divisor">Histórico</h2>
      <HistoricoVisitas visitas={visitas} />

      {ehAdmin && aberto && <div style={{ marginTop: 28 }}>
        <button type="button" className="btn perigo" aria-disabled={quadra ? undefined : true} onClick={() => { if (quadra) setExcluindo(true) }}>Excluir casa</button>
      </div>}
    </div>

    {excluindo && <div className="veu">
      <div className="folha" role="dialog" aria-label="Excluir casa">
        <h2>Excluir esta casa?</h2>
        <p>{rotuloCasa(casa)} sai da lista e do total do cartão. O histórico de visitas dela não será mais exibido. Isso não pode ser desfeito.</p>
        <div className="pilha">
          <button type="button" className="btn perigo" onClick={excluir}>Excluir casa</button>
          <button type="button" className="btn secundario" onClick={() => setExcluindo(false)}>Cancelar</button>
        </div>
      </div>
    </div>}

    {editando && <FolhaEditar casa={casa} onSalvar={salvarEdicao} onCancelar={() => setEditando(false)} />}
  </>
}
