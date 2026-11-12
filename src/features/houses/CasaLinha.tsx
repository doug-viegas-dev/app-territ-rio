import { Icone } from '@/app/icones'
import { rotuloStatus } from '@/domain/rotulos'
import type { Casa } from '@/domain/types'
import { SeloMarcas } from './SeloMarcas'
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
  const classe = ['casa', foco && 'foco', casa.naoVisitar && 'fora'].filter(Boolean).join(' ')
  return <button className={classe} type="button" aria-current={foco ? 'true' : undefined} onClick={() => onSelecionar(casa)}>
    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, textAlign: 'left' }}>
      <span className="rotulo">{rotuloCasa(casa)}</span>
      <SeloMarcas casa={casa} compacto />
    </span>
    <Estado casa={casa} />
  </button>
}
