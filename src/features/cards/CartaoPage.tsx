import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Carregando from '@/app/Carregando'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { useSessao } from '@/features/auth/AuthProvider'
import { abrirCartaoManual } from '@/firebase/cards'
import type { Cartao } from '@/domain/types'
import ImagemCartao from './ImagemCartao'
import { useCartao, useQuadras } from './useCartao'

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function ConfirmarAbertura({ cartao, nome, uid, onFechar }: { cartao: Cartao; nome: string; uid: string; onFechar: () => void }) {
  const [agora] = useState(() => Date.now())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(false)

  async function abrir() {
    setEnviando(true)
    setErro(false)
    try {
      await abrirCartaoManual(cartao, { uid, nome })
      onFechar()
    } catch {
      setErro(true)
      setEnviando(false)
    }
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Abrir cartão">
      <h2>Abrir o cartão {cartao.numero}?</h2>
      <p>Depois de aberto, qualquer pessoa registra visitas. Fica registrado que foi você, <b>{nome}</b>, em {data(agora)} às {hora(agora)}.</p>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível abrir</b>Tente de novo.</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={() => void abrir()} disabled={enviando}>Abrir cartão</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}

export default function CartaoPage() {
  const { cartaoId = '' } = useParams()
  const cartao = useCartao(cartaoId)
  const quadras = useQuadras(cartaoId)
  const { usuario, membro } = useSessao()
  const [confirmando, setConfirmando] = useState(false)
  const ehAdmin = membro?.papel === 'admin'

  if (cartao === undefined) return <>
    <Topo titulo="Cartão" voltarPara="/" voltarRotulo="Voltar para Cartões" />
    <div className="rolagem"><Carregando /></div>
  </>

  if (cartao === null) return <>
    <Topo titulo="Cartão" voltarPara="/" voltarRotulo="Voltar para Cartões" />
    <div className="rolagem"><div className="sem-casas">
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Cartão não encontrado</h2>
      <p style={{ color: 'var(--texto-suave)' }}>Ele pode ter sido removido. Volte para a lista de cartões.</p>
    </div></div>
  </>

  const fechado = cartao.estado !== 'aberto'
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
            : 'Para registrar visitas, um administrador precisa abrir o cartão. Peça a um deles.'}
          {ehAdmin && <span className="acoes">
            <button type="button" className="btn primario medio auto" onClick={() => setConfirmando(true)}><Icone nome="cadeado-aberto" className="ic ic-20" />Abrir cartão</button>
          </span>}
        </p>
      </div>}

      {cartao.imagemPath && <ImagemCartao path={cartao.imagemPath} numero={cartao.numero} />}

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
      {quadras.map((q) => <Link key={q.id} className="linha-quadra simples" to={`/cartao/${cartao.id}/quadra/${q.id}`}>
        <h3>{q.rotulo}</h3>
        <Icone nome="chev" className="ic chev" />
      </Link>)}
    </div>
    {confirmando && usuario && <ConfirmarAbertura cartao={cartao} uid={usuario.uid} nome={membro?.nome ?? usuario.nome} onFechar={() => setConfirmando(false)} />}
  </>
}
