import { useState } from 'react'
import { Conexao } from '@/app/Topo'
import { Icone } from '@/app/icones'
import { validarCasa } from '@/domain/casa'
import { podeRegistrarNaQuadra } from '@/domain/rodada'
import { rotuloStatus } from '@/domain/rotulos'
import type { Cartao, Casa, Quadra, Status } from '@/domain/types'
import { adicionarRua } from '@/firebase/blocks'
import { criarCasa, criarCasasEmFaixa } from '@/firebase/houses'
import { abrirRodada } from '@/firebase/rodadas'
import FaixaForm from './FaixaForm'
import { classeStatus, rotuloCasa } from './rotuloCasa'

type Props = {
  quadra: Quadra; casas: Casa[]; cartaoId: string; cartao: Cartao; usuario: { uid: string; nome: string }
  depoisDe?: Casa; onFechar: () => void; onErro?: () => void
}

const RESULTADOS: Status[] = ['pendente', 'falado', 'sem_resposta', 'nao_em_casa', 'carta']

const chave = (s: string) => s.toLocaleLowerCase('pt-BR')

function FolhaNovaRua({ quadra, ruas, onAdicionar, onCancelar }: { quadra: Quadra; ruas: string[]; onAdicionar: (nome: string) => void; onCancelar: () => void }) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function adicionar() {
    const limpo = nome.trim()
    if (!limpo) return setErro('Digite o nome da rua.')
    if (ruas.some((r) => chave(r) === chave(limpo))) return setErro('Essa rua já existe nesta quadra.')
    onAdicionar(limpo)
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Nova rua">
      <h2>Nova rua</h2>
      <div className="campo">
        <label htmlFor="nova-rua">Nome da rua</label>
        <input id="nova-rua" className="entrada" placeholder="Ex.: Rua das Palmeiras" value={nome} autoFocus onChange={(e) => { setNome(e.target.value); setErro(null) }} />
        {erro ? <span className="dica" role="alert" style={{ color: 'var(--cor-erro)' }}>{erro}</span> : <span className="dica">A rua fica disponível em toda a {quadra.rotulo}.</span>}
      </div>
      <div className="pilha">
        <button type="button" className="btn primario" onClick={adicionar}>Adicionar rua</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

function FolhaEscolherRua({ ruas, rua, onEscolher, onNova, onCancelar }: { ruas: string[]; rua: string; onEscolher: (r: string) => void; onNova: () => void; onCancelar: () => void }) {
  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Escolher rua">
      <h2>Qual rua?</h2>
      <div className="chips" role="radiogroup" aria-label="Rua" style={{ marginBottom: 16 }}>
        {ruas.map((r) => <button key={r} type="button" role="radio" aria-checked={r === rua} className={r === rua ? 'chip sel' : 'chip'} onClick={() => onEscolher(r)}>
          {r === rua && <Icone nome="check" className="ic ic-20" />}{r}
        </button>)}
      </div>
      <div className="pilha">
        <button type="button" className="btn secundario" onClick={onNova}><Icone nome="mais" className="ic ic-20" />Nova rua</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

export default function NovaCasaSheet({ quadra, casas, cartaoId, cartao, usuario, depoisDe, onFechar, onErro }: Props) {
  const [aba, setAba] = useState<'uma' | 'faixa'>('uma')
  const [extras, setExtras] = useState<string[]>([])
  const todas = [...quadra.ruas, ...casas.map((c) => c.rua), ...extras]
  const ruas = todas.filter((r, i) => todas.findIndex((x) => chave(x) === chave(r)) === i)
  const [rua, setRua] = useState(depoisDe?.rua ?? ruas[0] ?? '')
  const [numero, setNumero] = useState('')
  const [descricao, setDescricao] = useState('')
  const [depoisId, setDepoisId] = useState(depoisDe?.id)
  const [erro, setErro] = useState<string | null>(null)
  const [salva, setSalva] = useState<{ rotulo: string; rua: string; depois: boolean } | null>(null)
  const [novaRua, setNovaRua] = useState(false)
  const [escolhendoRua, setEscolhendoRua] = useState(false)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [resultado, setResultado] = useState<Status>('pendente')
  const podeResultado = podeRegistrarNaQuadra(cartao, quadra)
  const opQuadra = { quadraSemContadores: quadra.semContadores === true }

  const repetido = numero.trim() !== '' && casas.some((c) => c.rua === rua && c.numero?.trim() === numero.trim())

  function mudarRua(r: string) {
    setRua(r)
    setDepoisId(undefined)
  }

  function adicionarNovaRua(nome: string) {
    adicionarRua(cartaoId, quadra.id, nome).catch(() => onErro?.())
    setExtras((e) => [...e, nome])
    mudarRua(nome)
    setNovaRua(false)
    setEscolhendoRua(false)
  }

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function salvar(fechar: boolean) {
    const erroCasa = rua ? validarCasa({ numero, descricao }) : 'Escolha a rua.'
    if (erroCasa) return setErro(erroCasa)
    setErro(null)
    const depois = depoisId
    const rodada = quadra.rodadaAtual?.numero
    const registro = podeResultado && resultado !== 'pendente' && rodada !== undefined
      ? { resultado: { status: resultado, usuario, ciclo: cartao.ciclo, rodada } }
      : {}
    criarCasa(cartaoId, quadra.id, { rua, numero, descricao, depoisDe: depois, ...registro }, casas, opQuadra)
      .then((id) => { if (depois !== undefined) setDepoisId((atual) => (atual === depois ? id : atual)) })
      .catch(() => setErro('Não foi possível salvar a casa. Tente de novo.'))
    if (fechar) return onFechar()
    setSalva({ rotulo: rotuloCasa({ numero, descricao }), rua, depois: depois !== undefined })
    setNumero('')
    setDescricao('')
    setResultado('pendente')
    setMostrarResultado(false)
  }

  function abrirNovaRodada() {
    abrirRodada(cartaoId, quadra, usuario).catch(() => onErro?.())
  }

  return <div className="tela-sobre" role="dialog" aria-label="Nova casa">
    <header className="topo simples">
      <div className="topo-linha">
        <button type="button" className="voltar" aria-label={`Voltar para a ${quadra.rotulo}`} onClick={onFechar}><Icone nome="voltar" className="ic ic-28" /></button>
        <h1>Nova casa</h1>
        <Conexao />
      </div>
      <p className="topo-sub" style={{ marginBottom: 0 }}>{quadra.rotulo}</p>
    </header>

    <div className="rolagem" style={{ paddingBottom: 200 }}>
      {salva && aba === 'uma' && <div className="aviso" role="status" style={{ background: 'var(--superficie)', borderColor: 'var(--st-falado)' }}>
        <Icone nome="falado" className="ic c-falado" />
        <p><b>Casa salva</b>{salva.rotulo} entrou {salva.depois ? 'na posição escolhida' : `no fim da ${salva.rua}`}. Pode cadastrar a próxima.</p>
      </div>}

      <div className="segmento" style={{ marginBottom: 18 }} role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'uma'} className={aba === 'uma' ? 'ativo' : ''} onClick={() => setAba('uma')}>Uma casa</button>
        <button type="button" role="tab" aria-selected={aba === 'faixa'} className={aba === 'faixa' ? 'ativo' : ''} onClick={() => setAba('faixa')}>Faixa</button>
      </div>

      <div className="campo">
        <span className="rotulo-campo" id="rua-rotulo">Rua</span>
        {ruas.length > 4 ? <button type="button" className="chip" aria-haspopup="dialog" onClick={() => setEscolhendoRua(true)}>{rua || 'Escolher rua'} <small>Trocar</small></button>
          : <div className="chips" role="radiogroup" aria-labelledby="rua-rotulo">
            {ruas.map((r) => <button key={r} type="button" role="radio" aria-checked={r === rua} className={r === rua ? 'chip sel' : 'chip'} onClick={() => mudarRua(r)}>
              {r === rua && <Icone nome="check" className="ic ic-20" />}{r}
            </button>)}
            <button type="button" className="chip" style={{ background: 'transparent', border: '1.5px dashed var(--borda-forte)' }} onClick={() => setNovaRua(true)}>
              <Icone nome="mais" className="ic ic-20" />Nova rua
            </button>
          </div>}
      </div>

      {aba === 'uma' ? <>
        <div className="campo">
          <label htmlFor="casa-numero">Número <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>(opcional)</span></label>
          <input id="casa-numero" className="entrada" placeholder="Ex.: 120" value={numero} onChange={(e) => { setNumero(e.target.value); setErro(null) }} />
          {repetido && <div className="aviso" role="status" style={{ margin: '6px 0 0', background: 'var(--superficie)' }}>
            <Icone nome="info" />
            <p>Já existe um {numero.trim()} nesta rua. Pode salvar mesmo assim.</p>
          </div>}
        </div>
        <div className="campo">
          <label htmlFor="casa-descricao">Descrição curta</label>
          <input id="casa-descricao" className="entrada" placeholder="Ex.: portão azul" value={descricao} onChange={(e) => { setDescricao(e.target.value); setErro(null) }} />
          <span className="dica">Obrigatória sem número. {depoisDe ? "Entra logo depois da casa escolhida." : "Entra no fim da rua."} Mude em “Reordenar”.</span>
        </div>
        {!mostrarResultado && <button type="button" className="btn suave medio" style={{ marginBottom: 16 }} onClick={() => setMostrarResultado(true)}>Registrar resultado agora</button>}
        {mostrarResultado && <div className="campo">
          <span className="rotulo-campo" id="resultado-rotulo">O que aconteceu</span>
          <div className="chips" role="radiogroup" aria-labelledby="resultado-rotulo">
            {RESULTADOS.map((s) => {
              const nome = classeStatus(s)
              const marcado = podeResultado ? s === resultado : s === 'pendente'
              return <button key={s} type="button" role="radio" aria-checked={marcado} aria-disabled={podeResultado ? undefined : true}
                className="chip" style={{ ...(marcado && { borderColor: 'var(--cor-principal)', borderWidth: 3, fontWeight: 600 }), ...(podeResultado ? {} : { opacity: 0.6 }) }} onClick={() => { if (podeResultado) setResultado(s) }}>
                <Icone nome={nome} className="ic ic-20" />{rotuloStatus(s)}
              </button>
            })}
          </div>
          {!podeResultado && <div className="aviso" role="status" style={{ margin: '10px 0 0', background: 'var(--superficie)' }}>
            <Icone nome="info" />
            <p>Abra a volta para registrar o que aconteceu
              {cartao.estado === 'aberto' && !quadra.rodadaAtual && <span className="acoes">
                <button type="button" className="btn primario medio auto" onClick={abrirNovaRodada}>Abrir volta</button>
              </span>}
            </p>
          </div>}
        </div>}
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="barra-fixa" style={{ paddingTop: 14 }}>
          <div className="pilha">
            <button type="button" className="btn primario" onClick={() => salvar(false)}>Salvar e adicionar outra</button>
            <button type="button" className="btn secundario" onClick={() => salvar(true)}>Salvar</button>
          </div>
        </div>
      </> : <FaixaForm rua={rua} onCriar={(numeros) => {
        criarCasasEmFaixa(cartaoId, quadra.id, { rua, numeros }, casas, opQuadra).catch(() => onErro?.())
        onFechar()
      }} />}
    </div>

    {escolhendoRua && <FolhaEscolherRua ruas={ruas} rua={rua} onEscolher={(r) => { mudarRua(r); setEscolhendoRua(false) }} onNova={() => { setEscolhendoRua(false); setNovaRua(true) }} onCancelar={() => setEscolhendoRua(false)} />}
    {novaRua && <FolhaNovaRua quadra={quadra} ruas={ruas} onAdicionar={adicionarNovaRua} onCancelar={() => setNovaRua(false)} />}
  </div>
}
