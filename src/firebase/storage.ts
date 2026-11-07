import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './app'
import * as demo from '@/demo/banco'
import { demoAtivo } from '@/demo/modo'

const chaveUrl = (path: string) => `mapa-url:${path}`

/** A URL é pedida ao Firebase (rede). Guardamos a última para o mapa, já em cache no service worker, abrir sem internet. */
export async function urlDaImagem(path: string): Promise<string> {
  if (demoAtivo()) return demo.urlDoArquivo(path)
  try {
    const url = await getDownloadURL(ref(storage, path))
    try { localStorage.setItem(chaveUrl(path), url) } catch { /* sem armazenamento: segue sem guardar */ }
    return url
  } catch (erro) {
    let guardada: string | null = null
    try { guardada = localStorage.getItem(chaveUrl(path)) } catch { /* ignora */ }
    if (guardada) return guardada
    throw erro
  }
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
