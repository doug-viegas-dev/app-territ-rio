import { describe, expect, it } from 'vitest'
import { textoEvento } from './textoEvento'

describe('textoEvento', () => {
  it('descreve fechamento com reinício e rodadas', () => {
    expect(textoEvento({ motivo: 'fechamento_reinicio', porNome: 'Ana' })).toBe('Ana fechou e reiniciou o território')
    expect(textoEvento({ motivo: 'rodada_aberta', porNome: 'Ana', rodada: 2, quadraRotulo: 'Quadra 5' })).toBe('Ana abriu a rodada 2 da Quadra 5')
    expect(textoEvento({ motivo: 'rodada_encerrada', porNome: 'Ana', rodada: 2, quadraRotulo: 'Quadra 5' })).toBe('Ana encerrou a rodada 2 da Quadra 5')
  })
  it('descreve os cinco motivos', () => {
    expect(textoEvento({ motivo: 'reinicio', porNome: 'Maria S.' })).toBe('Maria S. reiniciou o território')
    expect(textoEvento({ motivo: 'abertura', porNome: 'Paulo R.' })).toBe('Paulo R. abriu o cartão')
    expect(textoEvento({ motivo: 'fechamento_manual', porNome: 'Maria S.' })).toBe('Maria S. fechou manualmente')
    expect(textoEvento({ motivo: 'fechamento_automatico', porNome: 'Ana P.' })).toBe('Automático: Ana P. registrou a última casa')
    expect(textoEvento({ motivo: 'criacao', porNome: 'Maria S.' })).toBe('Maria S. criou o cartão')
  })
})
