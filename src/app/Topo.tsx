import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from './icones'
import { Progresso } from './Progresso'
import { useOnline } from './useOnline'

type Props = {
  titulo: string
  logo?: boolean
  voltarPara?: string
  voltarRotulo?: string
  sub?: ReactNode
  progresso?: { resolvidas: number; total: number }
}

export function Conexao() {
  const online = useOnline()
  return online
    ? <span className="sync"><Icone nome="nuvem-ok" /><span className="so-leitor">Sincronizado</span></span>
    : <span className="sync"><Icone nome="offline" />Sem internet</span>
}

export default function Topo({ titulo, logo, voltarPara, voltarRotulo, sub, progresso }: Props) {
  const online = useOnline()
  return <>
    <header className={progresso || sub ? 'topo' : 'topo simples'}>
      <div className="topo-linha">
        {voltarPara && <Link className="voltar" to={voltarPara} aria-label={voltarRotulo ?? 'Voltar'}><Icone nome="voltar" className="ic ic-28" /></Link>}
        {logo && <svg width="36" height="36" viewBox="0 0 192 192" aria-hidden="true" style={{ flex: 'none' }}><use href="#i-logo" /></svg>}
        <h1>{titulo}</h1>
        <Conexao />
      </div>
      {sub && <p className="topo-sub">{sub}</p>}
      {progresso && <Progresso resolvidas={progresso.resolvidas} total={progresso.total} />}
    </header>
    {!online && <div className="aviso faixa" role="status"><Icone nome="offline" /><p>Sem internet — suas anotações serão enviadas depois.</p></div>}
  </>
}
