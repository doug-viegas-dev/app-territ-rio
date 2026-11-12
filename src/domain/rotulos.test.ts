import { expect, it } from 'vitest'
import { rotuloStatus } from './rotulos'

it('traduz os sete valores de StatusVisita', () => {
  expect((['pendente', 'falado', 'sem_resposta', 'nao_em_casa', 'carta', 'estudo', 'nao_visitar'] as const).map(rotuloStatus)).toEqual(['Pendente', 'Conversado', 'Não atendeu', 'Não em casa', 'Carta', 'Estudo', 'Não visitar'])
})
