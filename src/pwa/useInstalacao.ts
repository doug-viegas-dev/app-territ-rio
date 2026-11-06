import { useSyncExternalStore } from 'react'

type Resultado = 'accepted' | 'dismissed'
type EventoInstalacao = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: Resultado }> }
type Estado = { podeInstalar: boolean; instalado: boolean }

const modoStandalone = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches

let adiado: EventoInstalacao | null = null
let instalado = false
let estado: Estado = { podeInstalar: false, instalado: false }
const ouvintes = new Set<() => void>()

function atualizar() {
  estado = { podeInstalar: adiado !== null && !instalado, instalado }
  ouvintes.forEach((aviso) => aviso())
}

// O Chrome pode disparar o evento antes de a tela montar; por isso a captura é do módulo.
if (typeof window !== 'undefined') {
  instalado = modoStandalone()
  estado = { podeInstalar: false, instalado }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    adiado = e as EventoInstalacao
    atualizar()
  })
  window.addEventListener('appinstalled', () => {
    adiado = null
    instalado = true
    atualizar()
  })
}

export function reiniciarInstalacao() {
  adiado = null
  instalado = false
  atualizar()
}

async function instalar(): Promise<Resultado> {
  const evento = adiado
  if (!evento) return 'dismissed'
  await evento.prompt()
  const { outcome } = await evento.userChoice
  adiado = null
  atualizar()
  return outcome
}

function assinar(aviso: () => void): () => void {
  ouvintes.add(aviso)
  return () => { ouvintes.delete(aviso) }
}

export function useInstalacao(): Estado & { instalar(): Promise<Resultado> } {
  const atual = useSyncExternalStore(assinar, () => estado, () => estado)
  return { ...atual, instalar }
}
