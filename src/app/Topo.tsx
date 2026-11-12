import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from './icones'
import Logo from './Logo'
import { Progresso } from './Progresso'
import { useSincronizando } from '@/pwa/useSincronizando'
import { useOnline } from './useOnline'

type Props = {
  titulo: string
  logo?: boolean
  voltarPara?: string
  voltarRotulo?: string
  sub?: ReactNode
  progresso?: { resolvidas: number; total: number }
  naoEnviado?: boolean
  /** Falso quando a tela já mostra a conexão só pela pílula (Quadra). */
  faixaOffline?: boolean
}

export function Conexao({ naoEnviado = false }: { naoEnviado?: boolean }) {
  const online = useOnline()
  const sincronizando = useSincronizando()
  if (naoEnviado) return <span className="sync"><Icone nome="aviso" />Não enviado</span>
  if (online && sincronizando) return <span className="sync" role="status"><Icone nome="nuvem" />Sincronizando</span>
  return online
    ? <span className="sync"><Icone nome="nuvem-ok" /><span className="so-leitor">Sincronizado</span></span>
    : <span className="sync"><Icone nome="offline" /><span className="so-leitor">Sem internet</span></span>
}

export default function Topo({ titulo, logo, voltarPara, voltarRotulo, sub, progresso, naoEnviado, faixaOffline = true }: Props) {
  const online = useOnline()
  return <>
    <header className={progresso || sub ? 'topo' : 'topo simples'}>
      <div className="topo-linha">
        {voltarPara && <Link className="voltar" to={voltarPara} aria-label={voltarRotulo ?? 'Voltar'}><Icone nome="voltar" className="ic ic-28" /></Link>}
        {logo && <Logo tamanho={36} />}
        <h1 title={titulo}>{titulo}</h1>
        <Conexao naoEnviado={naoEnviado} />
      </div>
      {sub && <p className={voltarPara ? 'topo-sub com-voltar' : 'topo-sub'}>{sub}</p>}
      {progresso && <Progresso resolvidas={progresso.resolvidas} total={progresso.total} />}
    </header>
    {faixaOffline && !online && <div className="aviso faixa" role="status"><Icone nome="offline" /><p>Sem internet — suas anotações serão enviadas depois.</p></div>}
  </>
}
