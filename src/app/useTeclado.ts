import { useEffect } from 'react'

const CAMPOS = 'input, textarea, select'
const ehCampo = (alvo: EventTarget | null): alvo is HTMLElement => alvo instanceof HTMLElement && alvo.matches(CAMPOS)

/**
 * Faz o teclado do celular não cobrir o campo digitado:
 * - `--altura-visivel`: altura realmente visível (visualViewport), usada pela moldura do app;
 * - ao focar um campo, rola até ele ficar no centro da área visível;
 * - `data-teclado="aberto"` no <html> enquanto um campo tem foco (a barra da quadra some por CSS).
 */
export function useTeclado(): void {
  useEffect(() => {
    const raiz = document.documentElement
    const vv = window.visualViewport
    let timer: ReturnType<typeof setTimeout> | undefined

    const medir = () => {
      if (vv && vv.scale <= 1.01) raiz.style.setProperty('--altura-visivel', `${vv.height}px`)
    }
    const aoFocar = (e: FocusEvent) => {
      if (!ehCampo(e.target)) return
      const alvo = e.target
      raiz.dataset.teclado = 'aberto'
      clearTimeout(timer)
      timer = setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
    }
    const aoSair = (e: FocusEvent) => {
      if (!ehCampo(e.target)) return
      delete raiz.dataset.teclado
    }

    vv?.addEventListener('resize', medir)
    vv?.addEventListener('scroll', medir)
    document.addEventListener('focusin', aoFocar)
    document.addEventListener('focusout', aoSair)
    return () => {
      clearTimeout(timer)
      vv?.removeEventListener('resize', medir)
      vv?.removeEventListener('scroll', medir)
      document.removeEventListener('focusin', aoFocar)
      document.removeEventListener('focusout', aoSair)
      raiz.style.removeProperty('--altura-visivel')
      delete raiz.dataset.teclado
    }
  }, [])
}
