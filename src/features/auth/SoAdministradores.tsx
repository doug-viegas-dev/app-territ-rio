import { Icone } from '@/app/icones'
import { Conexao } from '@/app/Topo'

export default function SoAdministradores() {
  return <main className="app">
    <header className="topo simples">
      <div className="topo-linha"><h1>Administração</h1><Conexao /></div>
    </header>
    <div className="rolagem com-nav">
      <div className="sem-casas" style={{ paddingTop: 56 }}>
        <Icone nome="cadeado" className="ic ic-32" />
        <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>Só para administradores</h2>
        <p style={{ color: 'var(--texto-suave)', maxWidth: '30ch', margin: '0 auto' }}>Peça a um administrador da congregação para fazer esta alteração.</p>
      </div>
    </div>
  </main>
}
