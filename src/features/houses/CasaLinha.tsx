import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { rotuloStatus } from '@/domain/rotulos'
import type { Casa } from '@/domain/types'
import { classeStatus, rotuloCasa } from './rotuloCasa'

const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function Estado({ casa }: { casa: Casa }) {
  const nome = classeStatus(casa.status)
  if (casa.status === 'pendente') {
    return <span className="estado c-pendente"><Icone nome="pendente" /><span className="so-leitor">{rotuloStatus('pendente')}</span></span>
  }
  return <span className={`estado c-${nome}`}>
    <Icone nome={nome} />
    <span style={{ color: 'var(--cor-texto)' }}>
      {rotuloStatus(casa.status)}
      {casa.ultimaVisitaEm !== undefined && (casa.status === 'sem_resposta' || casa.status === 'falado') && <><br /><small>{dia(casa.ultimaVisitaEm)}</small></>}
    </span>
  </span>
}

type Props = { casa: Casa; foco: boolean; onSelecionar: (c: Casa) => void }

export default function CasaLinha({ casa, foco, onSelecionar }: Props) {
  return <button className={foco ? 'casa foco' : 'casa'} type="button" aria-current={foco ? 'true' : undefined} onClick={() => onSelecionar(casa)}>
    <span className="rotulo">{rotuloCasa(casa)}</span>
    <Estado casa={casa} />
  </button>
}

/** Casa em "Atenção": abre os detalhes, com a rua ao lado do rótulo. */
export function CasaAtencao({ casa, para }: { casa: Casa; para: string }) {
  return <Link className="casa" to={para}>
    <span className="rotulo">{rotuloCasa(casa)} <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>· {casa.rua}</span></span>
    <Estado casa={casa} />
  </Link>
}
