import { useEffect } from 'react'

const CAMPOS = 'input, textarea, select'
const ehCampo = (alvo: EventTarget | null): alvo is HTMLElement => alvo instanceof HTMLElement && alvo.matches(CAMPOS)
/** Quanto a área visível precisa voltar ao tamanho cheio para contar o teclado como fechado. */
const FOLGA = 120

/**
 * Faz o teclado do celular não cobrir o campo digitado:
 * - `--altura-visivel`: altura realmente visível (visualViewport), usada pela moldura do app;
 * - ao focar um campo, rola até ele ficar no centro da área visível;
 * - `data-teclado="aberto"` no <html> enquanto um campo tem foco e o teclado está aberto (a barra da quadra some por CSS).
 *   Sai ao perder o foco, ao a área visível voltar ao tamanho cheio (teclado fechado com o campo ainda focado)
 *   e quando o campo focado some da tela (o navegador não avisa com focusout).
 */
export function useTeclado(): void {
  useEffect(() => {
    const raiz = document.documentElement
    const vv = window.visualViewport
    let timer: ReturnType<typeof setTimeout> | undefined
    let maior = vv?.height ?? 0

    const fechar = () => { delete raiz.dataset.teclado }
    const medir = () => {
      if (!vv || vv.scale > 1.01) return
      raiz.style.setProperty('--altura-visivel', `${vv.height}px`)
      maior = Math.max(maior, vv.height)
      if (vv.height >= maior - FOLGA) fechar()
    }
    const aoFocar = (e: FocusEvent) => {
      if (!ehCampo(e.target)) return
      const alvo = e.target
      raiz.dataset.teclado = 'aberto'
      clearTimeout(timer)
      timer = setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
    }
    const aoSair = (e: FocusEvent) => { if (ehCampo(e.target)) fechar() }
    const observador = new MutationObserver(() => { if (raiz.dataset.teclado && !ehCampo(document.activeElement)) fechar() })

    vv?.addEventListener('resize', medir)
    vv?.addEventListener('scroll', medir)
    document.addEventListener('focusin', aoFocar)
    document.addEventListener('focusout', aoSair)
    observador.observe(document.body, { childList: true, subtree: true })
    return () => {
      clearTimeout(timer)
      observador.disconnect()
      vv?.removeEventListener('resize', medir)
      vv?.removeEventListener('scroll', medir)
      document.removeEventListener('focusin', aoFocar)
      document.removeEventListener('focusout', aoSair)
      raiz.style.removeProperty('--altura-visivel')
      fechar()
    }
  }, [])
}
