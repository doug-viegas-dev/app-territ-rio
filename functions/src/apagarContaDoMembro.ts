export type Dependencias = {
  membroExiste(email: string): Promise<boolean>
  uidDoEmail(email: string): Promise<string | null>
  apagarConta(uid: string): Promise<void>
}

const semConta = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === 'auth/user-not-found'

export async function apagarContaDoMembro(
  email: string,
  dep: Dependencias,
): Promise<'apagada' | 'sem_conta' | 'membro_voltou'> {
  if (await dep.membroExiste(email)) return 'membro_voltou'
  let uid: string | null
  try {
    uid = await dep.uidDoEmail(email)
  } catch (e) {
    if (semConta(e)) return 'sem_conta'
    throw e
  }
  if (!uid) return 'sem_conta'
  try {
    await dep.apagarConta(uid)
  } catch (e) {
    if (semConta(e)) return 'sem_conta'
    throw e
  }
  return 'apagada'
}
