import { Icone } from '@/app/icones'
import { useCampanha } from './CampanhaProvider'

export default function FaixaCampanha() {
  const campanha = useCampanha()
  if (!campanha) return null
  return <div className="campanha-faixa" role="status">
    <Icone nome="info" className="ic ic-20" />
    <p><b>Campanha: {campanha.nome}</b>{campanha.fase === 'ativa' ? ' · uma volta em cada quadra' : ' · em preparo, aguarde'}</p>
  </div>
}
