import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from './app'

export function urlDaImagem(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}
