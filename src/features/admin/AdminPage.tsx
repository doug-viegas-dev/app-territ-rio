import { useState } from 'react'
import Topo from '@/app/Topo'
import HistoricoAdmin from './HistoricoAdmin'
import ListaCartoesAdmin from './ListaCartoesAdmin'
import MembrosAdmin from './MembrosAdmin'

const ABAS = [
  { id: 'membros', rotulo: 'Membros' },
  { id: 'cartoes', rotulo: 'Cartões' },
  { id: 'historico', rotulo: 'Histórico' },
] as const
type AbaId = typeof ABAS[number]['id']

export default function AdminPage() {
  const [aba, setAba] = useState<AbaId>('membros')
  return <>
    <Topo titulo="Administração" />
    <div className="rolagem com-nav">
      <div className="segmento" style={{ marginBottom: 6 }} role="tablist" aria-label="Seções da administração">
        {ABAS.map((a) => <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-admin" className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>
      <div role="tabpanel" id="painel-admin" aria-labelledby={`aba-${aba}`}>
        {aba === 'membros' && <MembrosAdmin />}
        {aba === 'cartoes' && <ListaCartoesAdmin />}
        {aba === 'historico' && <HistoricoAdmin />}
      </div>
    </div>
  </>
}
