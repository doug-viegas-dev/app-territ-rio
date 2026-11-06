import { expect, it } from 'vitest'
import { rotuloStatus } from './rotulos'

it('traduz os cinco status', () => {
  expect(['pendente', 'sem_resposta', 'falado', 'estudo', 'nao_visitar'].map((s) => rotuloStatus(s as Parameters<typeof rotuloStatus>[0]))).toEqual(['Pendente', 'Não atendeu', 'Conversado', 'Estudo', 'Não visitar'])
})
