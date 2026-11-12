import { describe, it, expect, vi } from 'vitest'
import { apagarContaDoMembro, type Dependencias } from './apagarContaDoMembro.js'

function dep(p: Partial<Dependencias> = {}): Dependencias {
  return {
    membroExiste: vi.fn().mockResolvedValue(false),
    uidDoEmail: vi.fn().mockResolvedValue('uid1'),
    apagarConta: vi.fn().mockResolvedValue(undefined),
    ...p,
  }
}

describe('apagarContaDoMembro', () => {
  it('apaga a conta quando o membro continua removido', async () => {
    const d = dep()
    expect(await apagarContaDoMembro('ana@gmail.com', d)).toBe('apagada')
    expect(d.apagarConta).toHaveBeenCalledWith('uid1')
  })
  it('não apaga se o membro foi liberado de novo', async () => {
    const d = dep({ membroExiste: vi.fn().mockResolvedValue(true) })
    expect(await apagarContaDoMembro('ana@gmail.com', d)).toBe('membro_voltou')
    expect(d.apagarConta).not.toHaveBeenCalled()
    expect(d.uidDoEmail).not.toHaveBeenCalled()
  })
  it('sem conta no Auth devolve sem_conta', async () => {
    const d = dep({ uidDoEmail: vi.fn().mockResolvedValue(null) })
    expect(await apagarContaDoMembro('ana@gmail.com', d)).toBe('sem_conta')
    expect(d.apagarConta).not.toHaveBeenCalled()
  })
  it('auth/user-not-found ao apagar vira sem_conta', async () => {
    const d = dep({ apagarConta: vi.fn().mockRejectedValue({ code: 'auth/user-not-found' }) })
    expect(await apagarContaDoMembro('ana@gmail.com', d)).toBe('sem_conta')
  })
  it('relança erro temporário para a retentativa', async () => {
    const d = dep({ apagarConta: vi.fn().mockRejectedValue(new Error('indisponível')) })
    await expect(apagarContaDoMembro('ana@gmail.com', d)).rejects.toThrow('indisponível')
  })
})
