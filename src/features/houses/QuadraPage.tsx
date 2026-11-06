import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { podeRegistrar } from '@/domain/ciclo'
import { rotuloStatus } from '@/domain/rotulos'
import { isResolvida } from '@/domain/status'
import type { Casa, Status } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartao, useQuadras } from '@/features/cards/useCartao'
import { registrarVisita } from '@/firebase/houses'
import CasaLinha, { CasaAtencao } from './CasaLinha'
import NovaCasaSheet from './NovaCasaSheet'
import { classeStatus, rotuloCasa } from './rotuloCasa'
import { useCasas } from './useCasas'

const STATUS_REGISTRAVEIS: Status[] = ['falado', 'sem_resposta', 'estudo', 'nao_visitar']
const falta = (c: Casa) => c.status === 'pendente' || c.status === 'sem_resposta'
const atencao = (c: Casa) => c.status === 'estudo' || c.status === 'nao_visitar'

function proximaDoTrabalho(ordenadas: Casa[], atual: Casa): Casa | null {
  const aberta = (c: Casa) => c.id !== atual.id && falta(c)
  const i = ordenadas.findIndex((c) => c.id === atual.id)
  return ordenadas.slice(i + 1).find(aberta) ?? ordenadas.find(aberta) ?? null
}

export default function QuadraPage() {
  const { cartaoId = '', quadraId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadras(cartaoId)
  const casas = useCasas(cartaoId, quadraId)
  const { usuario, membro } = useSessao()
  const [modo, setModo] = useState<'trabalho' | 'todas'>('trabalho')
  const [focoId, setFocoId] = useState<string | null>(null)
  const [falha, setFalha] = useState<{ casa: Casa; novoStatus: Status } | null>(null)
  const [novaCasa, setNovaCasa] = useState<{ depoisDe?: Casa } | null>(null)

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
  const ehAdmin = membro?.papel === 'admin'
  const ruas = [...(quadra?.ruas ?? []), ...casas.map((c) => c.rua).filter((r, i, l) => l.indexOf(r) === i && !(quadra?.ruas ?? []).includes(r))]
  const grupos = ruas.map((rua) => ({ rua, casas: casas.filter((c) => c.rua === rua) })).filter((g) => g.casas.length > 0)
  const ordenadas = grupos.flatMap((g) => g.casas)
  const foco = ordenadas.find((c) => c.id === focoId) ?? ordenadas.find(falta) ?? ordenadas[0] ?? null
  const resolvidas = casas.filter((c) => isResolvida(c.status)).length
  const paraCasa = (c: Casa) => `/cartao/${cartaoId}/quadra/${quadraId}/casa/${c.id}`

  async function enviar(casa: Casa, novoStatus: Status, mover = true) {
    if (!cartao || !usuario || !podeRegistrar(cartao)) return
    if (mover) setFocoId(proximaDoTrabalho(ordenadas, casa)?.id ?? casa.id)
    setFalha(null)
    try {
      await registrarVisita({ cartao, quadraId, casa, novoStatus, usuario: { uid: usuario.uid, nome: membro?.nome ?? usuario.nome } })
    } catch {
      setFalha({ casa, novoStatus })
    }
  }

  const vazia = casas.length === 0
  return <>
    <Topo
      titulo={quadra?.rotulo ?? 'Quadra'}
      {...voltar}
      sub={`Cartão ${cartao.numero} · ${vazia ? 'nenhuma casa' : `${resolvidas} de ${casas.length} resolvidas`}`}
      progresso={vazia ? undefined : { resolvidas, total: casas.length }}
      naoEnviado={falha !== null}
    />
    {falha && <div className="aviso faixa erro" role="alert">
      <Icone nome="aviso" />
      <p><b>A última anotação não foi enviada</b>Ela está guardada neste aparelho. <button type="button" className="btn link" style={{ minHeight: 40 }} onClick={() => void enviar(falha.casa, falha.novoStatus, false)}>Tentar de novo</button></p>
    </div>}
    {!aberto && <div className="aviso faixa" role="status">
      <Icone nome="cadeado" />
      <p>
        <b>Cartão fechado</b>
        {ehAdmin ? 'Abra o cartão para registrar visitas. ' : 'Só um administrador pode abrir o cartão. Peça a um deles.'}
        {ehAdmin && <Link className="btn link" style={{ minHeight: 40 }} to={`/cartao/${cartaoId}`}>Abrir cartão</Link>}
      </p>
    </div>}

    {vazia && <div className="rolagem">
      <div className="sem-casas" style={{ paddingTop: 48 }}>
        <svg width="72" height="72" viewBox="0 0 192 192" aria-hidden="true" style={{ margin: '0 auto 14px', display: 'block' }}><use href="#i-logo" /></svg>
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
          <button type="button" className="btn secundario medio auto" style={{ minHeight: 52 }}><Icone nome="ordem" className="ic ic-20" />Reordenar</button>
        </div>

        {modo === 'trabalho' ? <>
          {grupos.map((g) => {
            const faltam = g.casas.filter(falta)
            if (faltam.length === 0) return null
            return <div key={g.rua}>
              <h2 className="titulo-secao">{g.rua} <small>{faltam.length} para visitar</small></h2>
              {faltam.map((c) => <CasaLinha key={c.id} casa={c} foco={c.id === foco.id} onSelecionar={(x) => setFocoId(x.id)} />)}
            </div>
          })}
          {ordenadas.some(atencao) && <>
            <h2 className="titulo-secao divisor">Atenção <small>{ordenadas.filter(atencao).length} {ordenadas.filter(atencao).length === 1 ? 'casa' : 'casas'}</small></h2>
            {ordenadas.filter(atencao).map((c) => <CasaAtencao key={c.id} casa={c} para={paraCasa(c)} />)}
          </>}
        </> : grupos.map((g) => <div key={g.rua}>
          <h2 className="titulo-secao">{g.rua} <small>{g.casas.length} {g.casas.length === 1 ? 'casa' : 'casas'}</small></h2>
          {g.casas.map((c) => <CasaLinha key={c.id} casa={c} foco={c.id === foco.id} onSelecionar={(x) => setFocoId(x.id)} />)}
        </div>)}
      </div>

      {aberto && <button type="button" className="fab sobre-barra" aria-label="Adicionar casa" onClick={() => setNovaCasa({})}><Icone nome="mais" />casa</button>}

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
              aria-disabled={aberto ? undefined : true}
              onClick={() => { if (aberto) void enviar(foco, s) }}
            >
              <Icone nome={nome} /><span>{rotuloStatus(s)}</span>
            </button>
          })}
        </div>
      </section>
    </>}
    {aberto && novaCasa && quadra && <NovaCasaSheet quadra={quadra} casas={casas} cartaoId={cartaoId} depoisDe={novaCasa.depoisDe} onFechar={() => setNovaCasa(null)} />}
  </>
}
