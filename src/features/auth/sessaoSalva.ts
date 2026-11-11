import type { MembroObservado } from '@/firebase/members'
import type { UsuarioAutenticado } from '@/firebase/auth'

/**
 * Última sessão conhecida neste aparelho. Permite abrir o app na hora, mesmo sem internet:
 * o servidor continua mandando (se o acesso foi retirado, a tela muda quando ele responder).
 */
export type SessaoSalva = { usuario: UsuarioAutenticado; membro: MembroObservado }

const CHAVE = 'territorio:sessao:v1'

export function lerSessaoSalva(): SessaoSalva | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Partial<SessaoSalva> | null
    const u = s?.usuario
    const m = s?.membro
    if (!u || typeof u.uid !== 'string' || typeof u.email !== 'string' || typeof u.nome !== 'string') return null
    if (!m || (m.papel !== 'admin' && m.papel !== 'publicador') || typeof m.ativo !== 'boolean' || typeof m.nome !== 'string') return null
    return { usuario: u, membro: m }
  } catch {
    return null
  }
}

export function salvarSessao(usuario: UsuarioAutenticado, membro: MembroObservado | null): void {
  try {
    if (membro) window.localStorage.setItem(CHAVE, JSON.stringify({ usuario, membro }))
    else window.localStorage.removeItem(CHAVE)
  } catch { /* armazenamento indisponível: só perde a abertura instantânea */ }
}

export function limparSessaoSalva(): void {
  try { window.localStorage.removeItem(CHAVE) } catch { /* idem */ }
}
