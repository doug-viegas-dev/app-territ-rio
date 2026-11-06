import { Icone } from '@/app/icones'
import { rotuloStatus } from '@/domain/rotulos'
import type { Visita } from '@/domain/types'
import { classeStatus } from './rotuloCasa'

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')

/** Visitas na ordem recebida (mais recente primeiro). */
export default function HistoricoVisitas({ visitas }: { visitas: Visita[] }) {
  if (visitas.length === 0) return <div className="sem-casas" style={{ padding: '12px 0 24px' }}>
    <p style={{ color: 'var(--texto-suave)' }}>Nenhuma visita ainda.</p>
  </div>
  return <ol className="tempo">
    {visitas.map((v) => <li key={v.id}>
      <span className={`c-${classeStatus(v.status)}`}><Icone nome={classeStatus(v.status)} className="ic ic-32" /></span>
      <div>
        <b>{rotuloStatus(v.status)}</b>
        <div className="quando">{data(v.em)} · {v.porNome} · Ciclo {v.ciclo}</div>
        {v.obs && <p className="obs">{v.obs}</p>}
      </div>
    </li>)}
  </ol>
}
