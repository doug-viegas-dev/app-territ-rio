import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Campanha } from '@/domain/types'
import { observarCampanha } from '@/firebase/campanha'

const Contexto = createContext<Campanha | null>(null)

/** Uma só leitura da campanha ativa para o app todo. `null`: nenhuma campanha (ou ainda carregando). */
export function CampanhaProvider({ children }: { children: ReactNode }) {
  const [campanha, setCampanha] = useState<Campanha | null>(null)
  useEffect(() => observarCampanha(setCampanha, () => { /* sem leitura, o app segue como sem campanha */ }), [])
  return <Contexto.Provider value={campanha}>{children}</Contexto.Provider>
}

export function useCampanha(): Campanha | null { return useContext(Contexto) }
/** Campanha em que se trabalha agora: só depois de iniciada por completo. */
export function useCampanhaAtiva(): Campanha | null {
  const c = useCampanha()
  return c && c.fase === 'ativa' ? c : null
}
