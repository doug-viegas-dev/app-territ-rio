const DISPENSADO = 'instalar-dispensado'

export const ehIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

export const ehSafariIos = () => ehIos() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)

export function emModoApp(): boolean {
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true
  const padrao = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  return ios || padrao
}

export function jaDispensado(): boolean {
  try {
    return localStorage.getItem(DISPENSADO) === '1'
  } catch {
    return false
  }
}

export function dispensarAviso(): void {
  try {
    localStorage.setItem(DISPENSADO, '1')
  } catch {
    // sem armazenamento: o aviso só some até a próxima abertura
  }
}
