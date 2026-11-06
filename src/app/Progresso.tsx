function percentual(resolvidas: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (resolvidas / total) * 100))
}

export function Progresso({ resolvidas, total, claro = false, rotulo }: { resolvidas: number; total: number; claro?: boolean; rotulo?: string }) {
  const pct = percentual(resolvidas, total)
  return <div className={claro ? 'progresso claro' : 'progresso'} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={resolvidas} aria-label={rotulo ?? `${resolvidas} de ${total} casas`}>
    <b style={{ width: `${pct}%` }} />
  </div>
}
