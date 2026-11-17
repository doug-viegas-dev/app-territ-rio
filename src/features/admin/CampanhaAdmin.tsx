import { useState } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { RESULTADOS_PADRAO, situacaoDaCampanha, validarCampanha } from '@/domain/campanha'
import { rotuloResultado } from '@/domain/rotulos'
import type { Status } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCampanha } from '@/features/campanha/CampanhaProvider'
import { continuarCampanha, encerrarCampanha, iniciarCampanha } from '@/firebase/campanha'

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')

function Opcao({ marcada, onClick, titulo, texto }: { marcada: boolean; onClick: () => void; titulo: string; texto: string }) {
  return <button type="button" role="radio" aria-checked={marcada} className="caixa-ok" onClick={onClick}>
    <span className={marcada ? 'marca' : 'marca vazia'}>{marcada && <Icone nome="check" className="ic ic-20" />}</span>
    <span><b>{titulo}</b><br />{texto}</span>
  </button>
}

function IniciarForm() {
  const { usuario, membro } = useSessao()
  const online = useOnline()
  const [nome, setNome] = useState('')
  const [resultados, setResultados] = useState<Status[]>(['falado', 'carta'])
  const [guardar, setGuardar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const alternar = (s: Status) => { setResultados((r) => (r.includes(s) ? r.filter((x) => x !== s) : [...r, s])); setErro(null) }

  function revisar() {
    const e = validarCampanha({ nome, resultados })
    if (e) return setErro(e)
    setConfirmando(true)
  }

  async function iniciar() {
    if (!usuario) return
    setOcupado(true)
    setErro(null)
    try {
      await iniciarCampanha({ nome, resultados: RESULTADOS_PADRAO.filter((s) => resultados.includes(s)), guardar }, { uid: usuario.uid, nome: membro?.nome ?? usuario.nome })
      setConfirmando(false)
    } catch {
      setErro('Não foi possível iniciar a campanha. Confira a conexão e tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  return <>
    <h2 className="titulo-secao">Campanha</h2>
    <p style={{ color: 'var(--texto-suave)' }}>Use quando o trabalho muda, como na distribuição de convites. Os cartões começam limpos, cada quadra tem uma volta só e só aparecem os resultados que você escolher.</p>
    <div className="campo">
      <label htmlFor="campanha-nome">Nome da campanha</label>
      <input id="campanha-nome" className="entrada" placeholder="Ex.: Convites da Celebração" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} />
    </div>
    <div className="campo">
      <span className="rotulo-campo" id="campanha-resultados">Resultados que valem na campanha</span>
      <div role="group" aria-labelledby="campanha-resultados">
        {RESULTADOS_PADRAO.map((s) => {
          const marcado = resultados.includes(s)
          return <button key={s} type="button" role="checkbox" aria-checked={marcado} className="caixa-ok" style={{ marginBottom: 8 }} onClick={() => alternar(s)}>
            <span className={marcado ? 'marca' : 'marca vazia'}>{marcado && <Icone nome="check" className="ic ic-20" />}</span>
            <span>{s === 'carta' ? 'Convite deixado' : rotuloResultado(s, false)}</span>
          </button>
        })}
      </div>
    </div>
    <div className="campo">
      <span className="rotulo-campo" id="campanha-guardar">O que fazer com o trabalho de agora</span>
      <div role="radiogroup" aria-labelledby="campanha-guardar">
        <Opcao marcada={guardar} onClick={() => setGuardar(true)} titulo="Guardar para retomar depois" texto="Tudo fica como está, guardado. No fim, o território volta ao ponto exato em que estava." />
        <Opcao marcada={!guardar} onClick={() => setGuardar(false)} titulo="Começar do zero" texto="O progresso de agora se perde. Os cartões voltam ao início." />
      </div>
    </div>
    {erro && !confirmando && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    {!online && <div className="aviso" role="status"><Icone nome="offline" /><p>Precisa de internet para iniciar uma campanha.</p></div>}
    <button type="button" className="btn primario" aria-disabled={online ? undefined : true} onClick={() => { if (online) revisar() }}>Iniciar campanha</button>

    {confirmando && <div className="veu">
      <div className="folha" role="alertdialog" aria-label="Iniciar campanha">
        <h2>Iniciar a campanha {nome.trim()}?</h2>
        <p>Todos os cartões ficam <b>fechados e limpos</b>: casas Pendentes e nenhuma volta. Depois abra os cartões que serão usados.</p>
        <p>{guardar ? <>O trabalho de agora fica <b>guardado</b> e volta no fim da campanha.</> : <>O progresso de agora <b>será perdido</b>. Esta ação não tem desfazer.</>}</p>
        <p style={{ color: 'var(--texto-suave)' }}>Avise a equipe e espere terminar: pode levar um minuto.</p>
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="pilha">
          <button type="button" className={guardar ? 'btn primario' : 'btn perigo'} aria-disabled={ocupado ? true : undefined} onClick={() => { if (!ocupado) void iniciar() }}>{ocupado ? 'Iniciando…' : 'Iniciar campanha'}</button>
          <button type="button" className="btn secundario" aria-disabled={ocupado ? true : undefined} onClick={() => { if (!ocupado) setConfirmando(false) }}>Cancelar</button>
        </div>
      </div>
    </div>}
  </>
}

function EmAndamento() {
  const { usuario, membro } = useSessao()
  const campanha = useCampanha()
  const online = useOnline()
  const [encerrando, setEncerrando] = useState(false)
  const [retomar, setRetomar] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  if (!campanha) return null
  const pronta = campanha.fase === 'ativa'
  const vaiRetomar = campanha.guardou && retomar
  const quem = { uid: usuario?.uid ?? '', nome: membro?.nome ?? usuario?.nome ?? '' }

  async function executar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setEncerrando(false)
    } catch {
      setErro('Não foi possível concluir. Confira a conexão e tente de novo: o que já foi feito não se repete.')
    } finally {
      setOcupado(false)
    }
  }

  return <>
    <h2 className="titulo-secao">Campanha</h2>
    <div className="painel-caixa">
      <h3 style={{ fontSize: 22 }}>{campanha.nome}</h3>
      <p style={{ color: 'var(--texto-suave)' }}>{situacaoDaCampanha(campanha)} · iniciada em {data(campanha.iniciadaEm)} por {campanha.iniciadaPorNome}</p>
      <p>Resultados: {campanha.resultados.map((s) => rotuloResultado(s, true)).join(', ')}.</p>
      <p>{campanha.guardou ? 'O trabalho de antes está guardado e pode ser retomado no fim.' : 'Começou do zero: não há trabalho de antes para retomar.'}</p>
    </div>
    {erro && !encerrando && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    {!online && <div className="aviso" role="status"><Icone nome="offline" /><p>Precisa de internet para continuar ou encerrar.</p></div>}
    {pronta
      ? <button type="button" className="btn primario" aria-disabled={online ? undefined : true} onClick={() => { if (online) setEncerrando(true) }}>Encerrar campanha</button>
      : <button type="button" className="btn primario" aria-disabled={online && !ocupado ? undefined : true} onClick={() => { if (online && !ocupado) void executar(() => continuarCampanha(quem)) }}>{ocupado ? 'Continuando…' : 'Continuar'}</button>}

    {encerrando && <div className="veu">
      <div className="folha" role="alertdialog" aria-label="Encerrar campanha">
        <h2>Encerrar a campanha {campanha.nome}?</h2>
        <p>Como o território deve ficar?</p>
        <div role="radiogroup" aria-label="Como o território deve ficar">
          {campanha.guardou && <Opcao marcada={retomar} onClick={() => setRetomar(true)} titulo="Retomar de onde estava" texto="Casas, voltas e cartões voltam exatamente ao que eram antes da campanha." />}
          <Opcao marcada={!vaiRetomar} onClick={() => setRetomar(false)} titulo="Recomeçar do zero" texto="Todas as casas voltam a Pendente, sem voltas, e os cartões ficam fechados. Esta ação não tem desfazer." />
        </div>
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="pilha">
          <button type="button" className={vaiRetomar ? 'btn primario' : 'btn perigo'} aria-disabled={ocupado ? true : undefined} onClick={() => { if (!ocupado) void executar(() => encerrarCampanha({ retomar: vaiRetomar }, quem)) }}>{ocupado ? 'Encerrando…' : 'Encerrar campanha'}</button>
          <button type="button" className="btn secundario" aria-disabled={ocupado ? true : undefined} onClick={() => { if (!ocupado) setEncerrando(false) }}>Cancelar</button>
        </div>
      </div>
    </div>}
  </>
}

export default function CampanhaAdmin() {
  const campanha = useCampanha()
  return campanha ? <EmAndamento /> : <IniciarForm />
}
