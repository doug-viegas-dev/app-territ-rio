import { describe, expect, it } from 'vitest'
import icones from '@/app/icones.tsx?raw'
import type { StatusVisita } from '@/domain/types'
import { classeStatus, rotuloCasa } from './rotuloCasa'

describe('rotuloCasa', () => {
  it('junta número e descrição', () => {
    expect(rotuloCasa({ numero: '120', descricao: 'portão azul' })).toBe('120 · portão azul')
  })
  it('só número', () => {
    expect(rotuloCasa({ numero: '120' })).toBe('120')
  })
  it('só descrição', () => {
    expect(rotuloCasa({ descricao: 'portão azul' })).toBe('portão azul')
  })
  it('ignora campos vazios', () => {
    expect(rotuloCasa({ numero: ' ', descricao: 'portão azul' })).toBe('portão azul')
  })
})

describe('classeStatus', () => {
  const esperado: Record<StatusVisita, string> = {
    pendente: 'pendente', falado: 'falado', sem_resposta: 'sem-resposta', nao_em_casa: 'nao-em-casa', carta: 'carta',
    estudo: 'estudo', nao_visitar: 'nao-visitar',
  }
  it.each(Object.entries(esperado))('%s vira %s (troca todos os sublinhados)', (status, classe) => {
    expect(classeStatus(status as StatusVisita)).toBe(classe)
  })
  it('os 5 status atuais têm ícone existente no sprite', () => {
    for (const s of ['pendente', 'falado', 'sem_resposta', 'nao_em_casa', 'carta'] as const) {
      const nome = classeStatus(s)
      expect(icones).toContain(`id="i-${nome}"`)
    }
  })
})
