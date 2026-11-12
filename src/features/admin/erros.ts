/** Texto de erro para o administrador: permissão negada tem frase própria. */
export function textoDeErro(e: unknown, padrao: string): string {
  const code = typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined
  return code === 'permission-denied' ? 'Você não tem permissão para fazer isso.' : padrao
}
