import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './app'

export function urlDaImagem(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

export async function enviarArquivosDoCartao(cartaoId: string, arquivos: { pdf: Blob; imagem: Blob }): Promise<{ pdfPath: string; imagemPath: string }> {
  const pdfPath = `cards/${cartaoId}/mapa.pdf`
  const imagemPath = `cards/${cartaoId}/mapa.webp`
  await Promise.all([
    uploadBytes(ref(storage, pdfPath), arquivos.pdf, { contentType: 'application/pdf' }),
    uploadBytes(ref(storage, imagemPath), arquivos.imagem, { contentType: 'image/webp' }),
  ])
  return { pdfPath, imagemPath }
}
