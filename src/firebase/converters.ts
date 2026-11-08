import { Timestamp } from 'firebase/firestore'
import type { Cartao, Casa, EventoCartao, Quadra, Status, Visita } from '@/domain/types'

export const paraTimestamp = (ms: number): Timestamp => Timestamp.fromMillis(ms)
export const paraMs = (valor: unknown): number | undefined => (valor instanceof Timestamp ? valor.toMillis() : undefined)

type Dados = Record<string, unknown>

export function cartaoDe(id: string, d: Dados): Cartao {
  return {
    id,
    numero: String(d.numero ?? ''),
    titulo: String(d.titulo ?? ''),
    ...(typeof d.mapsUrl === 'string' && { mapsUrl: d.mapsUrl }),
    ...(typeof d.imagemPath === 'string' && { imagemPath: d.imagemPath }),
    ...(typeof d.pdfPath === 'string' && { pdfPath: d.pdfPath }),
    estado: d.estado === 'aberto' ? 'aberto' : 'fechado',
    ciclo: Number(d.ciclo ?? 1),
    totalCasas: Number(d.totalCasas ?? 0),
    resolvidas: Number(d.resolvidas ?? 0),
    atualizadoEm: paraMs(d.atualizadoEm) ?? 0,
    ...(typeof d.abertoPorNome === 'string' && { abertoPorNome: d.abertoPorNome }),
    ...(paraMs(d.abertoEm) !== undefined && { abertoEm: paraMs(d.abertoEm) }),
  }
}

export function quadraDe(id: string, d: Dados): Quadra {
  return { id, rotulo: String(d.rotulo ?? ''), ruas: Array.isArray(d.ruas) ? d.ruas.map(String) : [], ordem: Number(d.ordem ?? 0), totalCasas: Number(d.totalCasas ?? 0), faltam: Number(d.faltam ?? 0), rodadasTotal: Number(d.rodadasTotal ?? 0) }
}

const STATUS: Status[] = ['pendente', 'sem_resposta', 'falado', 'estudo', 'nao_visitar']
const statusDe = (v: unknown): Status => (STATUS.includes(v as Status) ? (v as Status) : 'pendente')

export function casaDe(id: string, quadraId: string, d: Dados): Casa {
  return {
    id,
    quadraId,
    rua: String(d.rua ?? ''),
    ...(typeof d.numero === 'string' && { numero: d.numero }),
    ...(typeof d.descricao === 'string' && { descricao: d.descricao }),
    ordem: Number(d.ordem ?? 0),
    status: statusDe(d.status),
    ...(paraMs(d.ultimaVisitaEm) !== undefined && { ultimaVisitaEm: paraMs(d.ultimaVisitaEm) }),
    ...(typeof d.ultimoPor === 'string' && { ultimoPor: d.ultimoPor }),
    criadoEm: paraMs(d.criadoEm) ?? 0,
  }
}

export function visitaDe(id: string, d: Dados): Visita {
  return {
    id,
    status: statusDe(d.status),
    em: paraMs(d.em) ?? 0,
    porUid: String(d.porUid ?? ''),
    porNome: String(d.porNome ?? ''),
    ciclo: Number(d.ciclo ?? 1),
    ...(typeof d.obs === 'string' && { obs: d.obs }),
  }
}

export function eventoDe(id: string, d: Dados): EventoCartao {
  return {
    id,
    tipo: d.tipo === 'aberto' ? 'aberto' : 'fechado',
    motivo: d.motivo as EventoCartao['motivo'],
    em: paraMs(d.em) ?? 0,
    porUid: String(d.porUid ?? ''),
    porNome: String(d.porNome ?? ''),
  }
}
