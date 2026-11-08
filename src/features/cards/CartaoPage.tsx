import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { useOnline } from '@/app/useOnline'
import { quadrasParaVisitar } from '@/domain/rodada'
import { useSessao } from '@/features/auth/AuthProvider'
import ConfirmarAbertura from './ConfirmarAbertura'
import ImagemCartao from './ImagemCartao'
import { useCartao, useQuadras } from './useCartao'

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')

export default function CartaoPage() {
  const { cartaoId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadras(cartaoId)
  const { usuario, membro } = useSessao()
  const [confirmando, setConfirmando] = useState(false)
  const [todas, setTodas] = useState(false)
  const ehAdmin = membro?.papel === 'admin'
  const online = useOnline()

  if (cartao === undefined) return <>
    <Topo titulo="Cartão" voltarPara="/" voltarRotulo="Voltar para Cartões" />
    <div className="rolagem"><Carregando /></div>
  </>

  if (cartao === null) return <>
    <Topo titulo="Cartão" voltarPara="/" voltarRotulo="Voltar para Cartões" />
    <div className="rolagem"><div className="sem-casas">
      {online ? <>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Cartão não encontrado</h2>
        <p style={{ color: 'var(--texto-suave)' }}>Ele pode ter sido removido. Volte para a lista de cartões.</p>
      </> : <>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Este cartão não está neste aparelho</h2>
        <p style={{ color: 'var(--texto-suave)' }}>Sem internet não dá para abri-lo agora. Conecte-se e abra o cartão uma vez para usá-lo sem sinal.</p>
      </>}
    </div></div>
  </>

  const fechado = cartao.estado !== 'aberto'
  const visiveis = todas ? quadras : quadrasParaVisitar(quadras)
  return <>
    <Topo
      titulo={`Cartão ${cartao.numero}`}
      voltarPara="/"
      voltarRotulo="Voltar para Cartões"
      sub={`${cartao.titulo} · ${cartao.resolvidas} de ${cartao.totalCasas} casas`}
      progresso={{ resolvidas: cartao.resolvidas, total: cartao.totalCasas }}
    />
    <div className="rolagem">
      {fechado && <div className="aviso" role="status">
        <Icone nome="cadeado" className="ic ic-28" />
        <p>
          <b>Cartão fechado</b>
          {ehAdmin
            ? 'Para registrar visitas, um administrador precisa abrir o cartão. Fica registrado quem abriu.'
            : 'Só um administrador pode abrir o cartão. Peça a um deles.'}
          {ehAdmin && <span className="acoes">
            <button type="button" className="btn primario medio auto" onClick={() => setConfirmando(true)}><Icone nome="cadeado-aberto" className="ic ic-20" />Abrir cartão</button>
          </span>}
        </p>
      </div>}

      {cartao.imagemPath && <ImagemCartao key={cartao.imagemPath} path={cartao.imagemPath} numero={cartao.numero} />}

      {cartao.mapsUrl && <p style={{ margin: '14px 0 0' }}>
        <a className="btn secundario" href={cartao.mapsUrl} target="_blank" rel="noopener noreferrer"><Icone nome="pin" />Abrir no Google Maps</a>
      </p>}

      {!fechado && cartao.abertoPorNome && cartao.abertoEm !== undefined && <p className="estado" style={{ marginTop: 16, color: 'var(--texto-suave)' }}>
        <Icone nome="cadeado-aberto" className="ic ic-20" />Aberto por {cartao.abertoPorNome} em {data(cartao.abertoEm)}
      </p>}

      <h2 className="titulo-secao divisor">Quadras {quadras.length > 0 && <small>{quadras.length} {quadras.length === 1 ? 'quadra' : 'quadras'}</small>}</h2>
      {quadras.length === 0 && <div className="sem-casas">
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Nenhuma quadra ainda</h3>
        <p style={{ color: 'var(--texto-suave)' }}>O administrador cria as quadras e as ruas deste cartão.</p>
      </div>}
      {visiveis.map((q) => <Link key={q.id} className="linha-quadra simples" to={`/cartao/${cartao.id}/quadra/${q.id}`}>
        <div>
          <h3>{q.rotulo}</h3>
          {(q.totalCasas > 0 || q.rodadaAtual) && <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 14px', color: 'var(--texto-suave)' }}>
            {q.totalCasas > 0 && <span>{Math.max(0, q.faltam)} para visitar</span>}
            {q.rodadaAtual && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Icone nome="historico" className="ic ic-20" />Rodada aberta</span>}
          </span>}
        </div>
        <Icone nome="chev" className="ic chev" />
      </Link>)}
      {quadras.length > 0 && (todas || visiveis.length < quadras.length) && <button type="button" className="btn secundario" onClick={() => setTodas((v) => !v)}>
        {todas ? 'Mostrar só as que faltam' : 'Mostrar todas as quadras'}
      </button>}
    </div>
    {confirmando && usuario && <ConfirmarAbertura cartao={cartao} uid={usuario.uid} nome={membro?.nome ?? usuario.nome} onFechar={() => setConfirmando(false)} />}
  </>
}
