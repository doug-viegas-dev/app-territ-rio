import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'

const chaveUrl = (path: string) => `mapa-url:${path}`

async function urlDoFirebase(path: string): Promise<string> {
  const url = await getDownloadURL(ref(storage, path))
  try { localStorage.setItem(chaveUrl(path), url) } catch { /* sem armazenamento: segue sem guardar */ }
  return url
}

/**
 * Usa na hora a última URL guardada (a imagem em si já está no cache do service worker) e atualiza a URL em segundo plano.
 * Só pergunta ao Firebase, e espera por ele, quando ainda não há URL guardada.
 */
export async function urlDaImagem(path: string): Promise<string> {
  if (demoAtivo()) return demo.urlDoArquivo(path)
  let guardada: string | null = null
  try { guardada = localStorage.getItem(chaveUrl(path)) } catch { /* ignora */ }
  if (guardada) {
    void urlDoFirebase(path).catch(() => { /* sem rede: a guardada serve */ })
    return guardada
  }
  return urlDoFirebase(path)
}

/** Baixa a imagem do mapa para o cache do aparelho (o service worker guarda a resposta), para abrir sem internet. */
export async function baixarImagem(path: string): Promise<void> {
  if (demoAtivo()) return
  const url = await urlDoFirebase(path)
  await new Promise<void>((resolver) => {
    const img = new Image()
    img.onload = () => resolver()
    img.onerror = () => resolver()
    img.src = url
  })
}

export async function enviarArquivosDoCartao(cartaoId: string, arquivos: { pdf: Blob; imagem: Blob }): Promise<{ pdfPath: string; imagemPath: string }> {
  if (demoAtivo()) return demo.guardarArquivos(cartaoId, arquivos)
  const pdfPath = `cards/${cartaoId}/mapa.pdf`
  const imagemPath = `cards/${cartaoId}/mapa.webp`
  await Promise.all([
    uploadBytes(ref(storage, pdfPath), arquivos.pdf, { contentType: 'application/pdf' }),
    uploadBytes(ref(storage, imagemPath), arquivos.imagem, { contentType: 'image/webp' }),
  ])
  return { pdfPath, imagemPath }
}
