export default function Carregando() {
  return <div role="status" aria-label="Carregando">
    <div className="esqueleto" style={{ height: 22, width: 140, margin: '4px 0 12px' }} />
    <div className="esqueleto esqueleto-cartao" />
    <div className="esqueleto esqueleto-cartao" />
    <div className="esqueleto esqueleto-cartao" />
  </div>
}

export function TelaCarregando() {
  return <main className="app"><div className="rolagem"><Carregando /></div></main>
}
