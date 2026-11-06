export type Status = 'pendente' | 'sem_resposta' | 'falado' | 'estudo' | 'nao_visitar'
export type Casa = { id: string; quadraId?: string; rua: string; numero?: string; descricao?: string; ordem: number; status: Status; ultimaVisitaEm?: number; ultimoPor?: string; criadoEm: number }
export type Cartao = { id: string; numero: string; titulo: string; mapsUrl?: string; imagemPath?: string; pdfPath?: string; estado: 'aberto' | 'fechado'; ciclo: number; totalCasas: number; resolvidas: number; atualizadoEm: number; abertoPorNome?: string; abertoEm?: number }
export type Quadra = { id: string; rotulo: string; ruas: string[]; ordem: number }
export type Visita = { id: string; status: Status; em: number; porUid: string; porNome: string; ciclo: number; obs?: string }
export type Papel = 'admin' | 'publicador'
export type EventoCartao = { id: string; tipo: 'aberto' | 'fechado'; motivo: 'criacao' | 'abertura' | 'fechamento_manual' | 'fechamento_automatico' | 'reinicio'; em: number; porUid: string; porNome: string }
