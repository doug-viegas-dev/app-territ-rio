export type Status = 'pendente' | 'falado' | 'sem_resposta' | 'nao_em_casa' | 'carta'
/** Status que só aparecem em visitas antigas. */
export type StatusVisita = Status | 'estudo' | 'nao_visitar'
export type Casa = { id: string; quadraId?: string; rua: string; numero?: string; descricao?: string; ordem: number; status: Status; ultimaVisitaEm?: number; ultimoPor?: string; criadoEm: number; naoVisitar?: boolean; naoVisitarPor?: string; naoVisitarEm?: number; estudo?: boolean; estudoPor?: string; estudoEm?: number }
export type Cartao = { id: string; numero: string; titulo: string; mapsUrl?: string; imagemPath?: string; pdfPath?: string; estado: 'aberto' | 'fechado'; ciclo: number; totalCasas: number; resolvidas: number; atualizadoEm: number; abertoPorNome?: string; abertoEm?: number }
export type RodadaAtual = { id: string; numero: number; porNome: string; em: number }
export type Quadra = { id: string; rotulo: string; ruas: string[]; ordem: number; totalCasas: number; faltam: number; rodadasTotal: number; rodadaAtual?: RodadaAtual; semContadores?: boolean }
export type Rodada = { id: string; numero: number; abertaPorUid: string; abertaPorNome: string; abertaEm: number; encerradaPorUid?: string; encerradaPorNome?: string; encerradaEm?: number }
export type Visita = { id: string; status?: StatusVisita; em: number; porUid: string; porNome: string; ciclo: number; rodada?: number; obs?: string; expiraEm?: number }
export type Papel = 'admin' | 'publicador'
export type EventoCartao = { id: string; tipo: 'aberto' | 'fechado' | 'rodada'; motivo: 'criacao' | 'abertura' | 'fechamento_manual' | 'fechamento_automatico' | 'reinicio' | 'fechamento_reinicio' | 'rodada_aberta' | 'rodada_encerrada'; em: number; porUid: string; porNome: string; quadraId?: string; quadraRotulo?: string; rodada?: number }
