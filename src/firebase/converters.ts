import { Timestamp } from 'firebase/firestore'
import type { Cartao, Casa, EventoCartao, Quadra, Rodada, RodadaAtual, Status, Visita } from '@/domain/types'

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

function rodadaAtualDe(v: unknown): RodadaAtual | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Dados
  if (typeof r.id !== 'string' || typeof r.numero !== 'number') return undefined
  const em = typeof r.em === 'number' ? r.em : (paraMs(r.em) ?? 0)
  return { id: r.id, numero: r.numero, porNome: String(r.porNome ?? ''), em }
}

export function quadraDe(id: string, d: Dados): Quadra {
  const rodadaAtual = rodadaAtualDe(d.rodadaAtual)
  return {
    id,
    rotulo: String(d.rotulo ?? ''),
    ruas: Array.isArray(d.ruas) ? d.ruas.map(String) : [],
    ordem: Number(d.ordem ?? 0),
    totalCasas: Number(d.totalCasas ?? 0),
    faltam: Number(d.faltam ?? 0),
    rodadasTotal: Number(d.rodadasTotal ?? 0),
    ...(rodadaAtual && { rodadaAtual }),
  }
}

export function rodadaDe(id: string, d: Dados): Rodada {
  return {
    id,
    numero: Number(d.numero ?? 0),
    abertaPorUid: String(d.abertaPorUid ?? ''),
    abertaPorNome: String(d.abertaPorNome ?? ''),
    abertaEm: paraMs(d.abertaEm) ?? 0,
    ...(typeof d.encerradaPorUid === 'string' && { encerradaPorUid: d.encerradaPorUid }),
    ...(typeof d.encerradaPorNome === 'string' && { encerradaPorNome: d.encerradaPorNome }),
    ...(paraMs(d.encerradaEm) !== undefined && { encerradaEm: paraMs(d.encerradaEm) }),
  }
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
    ...(typeof d.rodada === 'number' && { rodada: d.rodada }),
    ...(typeof d.obs === 'string' && { obs: d.obs }),
  }
}

export function eventoDe(id: string, d: Dados): EventoCartao {
  return {
    id,
    tipo: d.tipo === 'aberto' ? 'aberto' : d.tipo === 'rodada' ? 'rodada' : 'fechado',
    motivo: d.motivo as EventoCartao['motivo'],
    em: paraMs(d.em) ?? 0,
    porUid: String(d.porUid ?? ''),
    porNome: String(d.porNome ?? ''),
    ...(typeof d.quadraId === 'string' && { quadraId: d.quadraId }),
    ...(typeof d.quadraRotulo === 'string' && { quadraRotulo: d.quadraRotulo }),
    ...(typeof d.rodada === 'number' && { rodada: d.rodada }),
  }
}
