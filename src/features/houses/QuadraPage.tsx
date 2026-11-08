import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Logo from '@/app/Logo'
import Topo from '@/app/Topo'
import { useOnline } from '@/app/useOnline'
import { listaDeTrabalho, podeRegistrar } from '@/domain/ciclo'
import { podeRegistrarNaQuadra } from '@/domain/rodada'
import { rotuloStatus } from '@/domain/rotulos'
import { isResolvida } from '@/domain/status'
import type { Casa, Status } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartao, useQuadras } from '@/features/cards/useCartao'
import { registrarVisita } from '@/firebase/houses'
import FaixaRodada from './FaixaRodada'
import CasaLinha, { CasaAtencao } from './CasaLinha'
import NovaCasaSheet from './NovaCasaSheet'
import ReordenarLista from './ReordenarLista'
import { classeStatus, rotuloCasa } from './rotuloCasa'
import { useCasasInfo } from './useCasas'

const STATUS_REGISTRAVEIS: Status[] = ['falado', 'sem_resposta', 'estudo', 'nao_visitar']
const falta = (c: Casa) => c.status === 'pendente' || c.status === 'sem_resposta'

function proximaDoTrabalho(ordenadas: Casa[], atual: Casa): Casa | null {
  const aberta = (c: Casa) => c.id !== atual.id && falta(c)
  const i = ordenadas.findIndex((c) => c.id === atual.id)
  return ordenadas.slice(i + 1).find(aberta) ?? ordenadas.find(aberta) ?? null
}

export default function QuadraPage() {
  const { cartaoId = '', quadraId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadras(cartaoId)
  const { casas, semDados } = useCasasInfo(cartaoId, quadraId)
  const online = useOnline()
  const { usuario, membro } = useSessao()
  const [modo, setModo] = useState<'trabalho' | 'todas'>('trabalho')
  const [focoId, setFocoId] = useState<string | null>(null)
  const [falha, setFalha] = useState<{ casa: Casa; novoStatus: Status } | null>(null)
  const [novaCasa, setNovaCasa] = useState<{ depoisDe?: Casa } | null>(null)
  const [reordenando, setReordenando] = useState(false)
  const [erroEscrita, setErroEscrita] = useState(false)

  const quadra = quadras.find((q) => q.id === quadraId)
  const voltar = { voltarPara: `/cartao/${cartaoId}`, voltarRotulo: cartao ? `Voltar para o Cartão ${cartao.numero}` : 'Voltar' }

  if (cartao === undefined || casas === null) return <>
    <Topo titulo={quadra?.rotulo ?? 'Quadra'} {...voltar} />
    <div className="rolagem"><Carregando /></div>
  </>
  if (cartao === null) return <>
    <Topo titulo="Quadra" voltarPara="/" voltarRotulo="Voltar para Cartões" />
    <div className="rolagem"><div className="sem-casas"><h2 style={{ fontSize: 22 }}>Cartão não encontrado</h2></div></div>
  </>

  const aberto = podeRegistrar(cartao)
  const podeAnotar = !!quadra && podeRegistrarNaQuadra(cartao, quadra)
  const ehAdmin = membro?.papel === 'admin'
  const ruas = [...(quadra?.ruas ?? []), ...casas.map((c) => c.rua).filter((r, i, l) => l.indexOf(r) === i && !(quadra?.ruas ?? []).includes(r))]
  const grupos = ruas.map((rua) => ({ rua, casas: casas.filter((c) => c.rua === rua) })).filter((g) => g.casas.length > 0)
  const ordenadas = grupos.flatMap((g) => g.casas)
  const destacadas = grupos.flatMap((g) => listaDeTrabalho(g.casas).destacadas)
  const foco = ordenadas.find((c) => c.id === focoId) ?? ordenadas.find(falta) ?? ordenadas[0] ?? null
  const semFaltar = grupos.every((g) => listaDeTrabalho(g.casas).pendentes.length === 0)
  const resolvidas = casas.filter((c) => isResolvida(c.status)).length
  const paraCasa = (c: Casa) => `/cartao/${cartaoId}/quadra/${quadraId}/casa/${c.id}`

  async function enviar(casa: Casa, novoStatus: Status, mover = true) {
    const rodada = quadra?.rodadaAtual?.numero
    if (!cartao || !usuario || !quadra || rodada === undefined || !podeRegistrarNaQuadra(cartao, quadra)) return
    if (mover) setFocoId(proximaDoTrabalho(ordenadas, casa)?.id ?? casa.id)
    setFalha(null)
    try {
      await registrarVisita({ cartao, quadraId, rodada, casa, novoStatus, usuario: { uid: usuario.uid, nome: membro?.nome ?? usuario.nome } })
    } catch {
      setFalha({ casa, novoStatus })
    }
  }

  const vazia = casas.length === 0
  // Sem rede e sem cache desta quadra: a lista vazia não é a verdade, então não convida a cadastrar.
  const semCache = vazia && semDados && !online
  const aoFalharEscrita = () => setErroEscrita(true)
  const sheet = aberto && novaCasa && quadra && usuario
    ? <NovaCasaSheet quadra={quadra} casas={casas} cartaoId={cartaoId} cartao={cartao} usuario={{ uid: usuario.uid, nome: membro?.nome ?? usuario.nome }} depoisDe={novaCasa.depoisDe} onFechar={() => setNovaCasa(null)} onErro={aoFalharEscrita} />
    : null

  if (reordenando && aberto && !vazia) return <>
    <header className="topo simples">
      <div className="topo-linha">
        <button type="button" className="voltar" aria-label={`Voltar para a ${quadra?.rotulo ?? 'quadra'}`} onClick={() => setReordenando(false)}><Icone nome="voltar" className="ic ic-28" /></button>
        <h1>Reordenar</h1>
        <button type="button" className="topo-acao" onClick={() => setReordenando(false)}><Icone nome="check" />Concluir</button>
      </div>
      <p className="topo-sub" style={{ marginBottom: 0 }}>{quadra?.rotulo ?? 'Quadra'} · na ordem em que aparecem na rua</p>
    </header>
    <div className="rolagem">
      <ReordenarLista casas={casas} ruas={ruas} cartaoId={cartaoId} quadraId={quadraId} onErro={aoFalharEscrita} onAdicionarDepois={(c) => setNovaCasa({ depoisDe: c })} />
    </div>
    {sheet}
  </>

  return <>
    <Topo
      titulo={quadra?.rotulo ?? 'Quadra'}
      {...voltar}
      sub={`Cartão ${cartao.numero} · ${vazia ? 'nenhuma casa' : `${resolvidas} de ${casas.length} resolvidas`}`}
      progresso={vazia ? undefined : { resolvidas, total: casas.length }}
      naoEnviado={falha !== null}
    />
    {erroEscrita && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p><b>Não foi possível salvar</b>A última alteração não foi aceita. Confira o que aparece na lista e tente de novo. <button type="button" className="btn link" style={{ minHeight: 40 }} onClick={() => setErroEscrita(false)}>Entendi</button></p>
    </div>}
    {falha && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p><b>A última anotação não foi enviada</b>Ela está guardada neste aparelho. <button type="button" className="btn link" style={{ minHeight: 40 }} onClick={() => void enviar(falha.casa, falha.novoStatus, false)}>Tentar de novo</button></p>
    </div>}
    {quadra && <FaixaRodada cartaoId={cartaoId} quadra={quadra} cartaoAberto={aberto} onErro={aoFalharEscrita} />}
    {!aberto && <div className="aviso faixa" role="status">
      <Icone nome="cadeado" />
      <p>
        <b>Cartão fechado</b>
        {ehAdmin ? 'Abra o cartão para registrar visitas. ' : 'Só um administrador pode abrir o cartão. Peça a um deles.'}
        {ehAdmin && <Link className="btn link" style={{ minHeight: 40 }} to={`/cartao/${cartaoId}`}>Abrir cartão</Link>}
      </p>
    </div>}

    {semCache && <div className="rolagem">
      <div className="sem-casas" style={{ paddingTop: 48 }}>
        <Icone nome="offline" className="ic ic-32" />
        <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>Esta quadra não está neste aparelho</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Conecte-se à internet e abra a quadra uma vez para usá-la sem sinal.</p>
      </div>
    </div>}

    {vazia && !semCache && <div className="rolagem">
      <div className="sem-casas" style={{ paddingTop: 48 }}>
        <Logo tamanho={72} className="logo-vazio" />
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Nenhuma casa nesta quadra</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto 22px' }}>Cadastre as casas na ordem em que aparecem na rua.</p>
        {aberto && <button type="button" className="btn primario" style={{ maxWidth: 260, margin: '0 auto' }} onClick={() => setNovaCasa({})}><Icone nome="mais" />Cadastrar a primeira casa</button>}
      </div>
    </div>}

    {!vazia && foco && <>
      <div className="rolagem com-barra">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
          <div className="segmento" style={{ flex: 1 }} role="tablist">
            <button type="button" role="tab" aria-selected={modo === 'trabalho'} className={modo === 'trabalho' ? 'ativo' : ''} onClick={() => setModo('trabalho')}>Trabalho</button>
            <button type="button" role="tab" aria-selected={modo === 'todas'} className={modo === 'todas' ? 'ativo' : ''} onClick={() => setModo('todas')}>Todas</button>
          </div>
          {aberto && <button type="button" className="btn secundario medio auto" style={{ minHeight: 52 }} onClick={() => setReordenando(true)}><Icone nome="ordem" className="ic ic-20" />Reordenar</button>}
        </div>

        {modo === 'trabalho' ? <>
          {semFaltar && <div className="sem-casas" style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Nada para visitar nesta quadra</h2>
            <button type="button" className="btn secundario medio auto" style={{ margin: '0 auto' }} onClick={() => setModo('todas')}>Ver todas as casas</button>
          </div>}
          {grupos.map((g) => {
            const faltam = listaDeTrabalho(g.casas).pendentes
            if (faltam.length === 0) return null
            return <div key={g.rua}>
              <h2 className="titulo-secao">{g.rua} <small>{faltam.length} para visitar</small></h2>
              {faltam.map((c) => <CasaLinha key={c.id} casa={c} foco={c.id === foco.id} onSelecionar={(x) => setFocoId(x.id)} />)}
            </div>
          })}
          {destacadas.length > 0 && <>
            <h2 className="titulo-secao divisor">Atenção <small>{destacadas.length} {destacadas.length === 1 ? 'casa' : 'casas'}</small></h2>
            {destacadas.map((c) => <CasaAtencao key={c.id} casa={c} para={paraCasa(c)} />)}
          </>}
        </> : grupos.map((g) => <div key={g.rua}>
          <h2 className="titulo-secao">{g.rua} <small>{g.casas.length} {g.casas.length === 1 ? 'casa' : 'casas'}</small></h2>
          {g.casas.map((c) => <CasaLinha key={c.id} casa={c} foco={c.id === foco.id} onSelecionar={(x) => setFocoId(x.id)} />)}
        </div>)}
      </div>

      {aberto && <button type="button" className="fab sobre-barra" aria-label="Adicionar casa" onClick={() => setNovaCasa({})}><Icone nome="casa-mais" className="ic ic-28" /></button>}

      <section className="barra-fixa" aria-label="Registrar visita">
        <div className="quem">
          <div><b>{rotuloCasa(foco)}</b><span>{foco.rua}</span></div>
          <Link className="detalhes" to={paraCasa(foco)}>Detalhes<Icone nome="chev" className="ic ic-20" /></Link>
        </div>
        <div className="grade-status">
          {STATUS_REGISTRAVEIS.map((s) => {
            const atual = foco.status === s
            const nome = classeStatus(s)
            return <button
              key={s}
              type="button"
              className={`bs c-${nome}${atual ? ' sel' : ''}`}
              style={{ minHeight: 56 }}
              aria-pressed={atual}
              aria-disabled={podeAnotar ? undefined : true}
              onClick={() => { if (podeAnotar) void enviar(foco, s) }}
            >
              <Icone nome={nome} /><span>{rotuloStatus(s)}</span>
            </button>
          })}
        </div>
      </section>
    </>}
    {sheet}
  </>
}
