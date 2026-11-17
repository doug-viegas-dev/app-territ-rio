import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icone } from '@/app/icones'
import Topo from '@/app/Topo'
import { useCampanha } from '@/features/campanha/CampanhaProvider'
import CampanhaAdmin from './CampanhaAdmin'
import HistoricoAdmin from './HistoricoAdmin'
import ListaCartoesAdmin from './ListaCartoesAdmin'
import MembrosAdmin from './MembrosAdmin'

const ABAS = [
  { id: 'membros', rotulo: 'Membros' },
  { id: 'cartoes', rotulo: 'Cartões' },
  { id: 'historico', rotulo: 'Histórico' },
] as const
type AbaId = typeof ABAS[number]['id']

/** A campanha é rara: fica numa linha no alto de Cartões, e não numa aba a mais. */
function LinhaCampanha({ onAbrir }: { onAbrir: () => void }) {
  const campanha = useCampanha()
  return <button type="button" className="linha-quadra simples" style={{ width: '100%', textAlign: 'left' }} onClick={onAbrir}>
    <div>
      <h3>Campanha</h3>
      <span style={{ color: 'var(--texto-suave)' }}>{campanha ? `Em andamento: ${campanha.nome}` : 'Nenhuma em andamento'}</span>
    </div>
    <Icone nome="chev" className="ic chev" />
  </button>
}

export default function AdminPage() {
  const pedida = (useLocation().state as { aba?: string } | null)?.aba
  const [aba, setAba] = useState<AbaId>(ABAS.find((a) => a.id === pedida)?.id ?? 'membros')
  const [campanha, setCampanha] = useState(false)
  return <>
    <Topo titulo="Administração" />
    <div className="rolagem com-nav">
      {campanha ? <>
        <button type="button" className="btn secundario medio auto" style={{ marginBottom: 12 }} onClick={() => setCampanha(false)}><Icone nome="voltar" className="ic ic-20" />Voltar para Cartões</button>
        <CampanhaAdmin />
      </> : <>
        <div className="segmento" style={{ marginBottom: 6 }} role="tablist" aria-label="Seções da administração">
          {ABAS.map((a) => <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-admin" className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
        </div>
        <div role="tabpanel" id="painel-admin" aria-labelledby={`aba-${aba}`}>
          {aba === 'membros' && <MembrosAdmin />}
          {aba === 'cartoes' && <>
            <LinhaCampanha onAbrir={() => setCampanha(true)} />
            <ListaCartoesAdmin />
          </>}
          {aba === 'historico' && <HistoricoAdmin />}
        </div>
      </>}
    </div>
  </>
}
