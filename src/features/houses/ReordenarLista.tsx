import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Icone } from '@/app/icones'
import type { Casa } from '@/domain/types'
import { moverCasa } from '@/firebase/houses'
import { destinoDoMovimento } from './destinoDoMovimento'
import { rotuloCasa } from './rotuloCasa'

type Props = {
  casas: Casa[]
  ruas: string[]
  cartaoId: string
  quadraId: string
  onAdicionarDepois: (casa: Casa) => void
  onErro?: () => void
}

type LinhaProps = {
  casa: Casa
  aberta: boolean
  podeMudarDeRua: boolean
  onAlternar: () => void
  onMudarDeRua: () => void
  onAdicionarDepois: () => void
}

function Linha({ casa, aberta, podeMudarDeRua, onAlternar, onMudarDeRua, onAdicionarDepois }: LinhaProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: casa.id })
  const rotulo = rotuloCasa(casa)
  return <div
    ref={(el) => { setNodeRef(el); setActivatorNodeRef(el) }}
    {...attributes}
    {...listeners}
    role={undefined}
    aria-roledescription="item que pode ser arrastado"
    className={aberta ? 'linha-ordem aberta' : 'linha-ordem'}
    style={{ transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 2 : undefined, opacity: isDragging ? 0.85 : undefined }}
  >
    <div className="principal">
      <button type="button" className="rotulo" aria-expanded={aberta} style={{ textAlign: 'left', background: 'none', border: 0, minHeight: 48, touchAction: 'manipulation' }} onClick={onAlternar}>{rotulo}</button>
    </div>
    {aberta && <div className="extra">
      {podeMudarDeRua && <button type="button" className="btn suave medio" onClick={onMudarDeRua}><Icone nome="mover" className="ic ic-20" />Mover para outra rua</button>}
      <button type="button" className="btn suave medio" onClick={onAdicionarDepois}><Icone nome="mais" className="ic ic-20" />Adicionar depois desta</button>
    </div>}
  </div>
}

function FolhaMover({ casa, destinos, onMover, onCancelar }: { casa: Casa; destinos: string[]; onMover: (rua: string) => void; onCancelar: () => void }) {
  const [rua, setRua] = useState(destinos[0])
  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Mover para outra rua">
      <h2>Mover para qual rua?</h2>
      <p>“{rotuloCasa(casa)}” vai para o fim da rua escolhida.</p>
      <div className="chips" role="radiogroup" aria-label="Rua" style={{ marginBottom: 16 }}>
        {destinos.map((r) => <button key={r} type="button" role="radio" aria-checked={r === rua} className={r === rua ? 'chip sel' : 'chip'} onClick={() => setRua(r)}>
          {r === rua && <Icone nome="check" className="ic ic-20" />}{r}
        </button>)}
      </div>
      <div className="pilha">
        <button type="button" className="btn primario" onClick={() => onMover(rua)}>Mover</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

export default function ReordenarLista({ casas, ruas, cartaoId, quadraId, onAdicionarDepois, onErro }: Props) {
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [movendo, setMovendo] = useState<Casa | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const todas = [...ruas, ...casas.map((c) => c.rua)]
  const nomes = todas.filter((r, i) => todas.indexOf(r) === i)
  const grupos = nomes.map((rua) => ({ rua, casas: casas.filter((c) => c.rua === rua) })).filter((g) => g.casas.length > 0)

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function mover(casa: Casa, rua: string, antes: Casa | null, depois: Casa | null) {
    moverCasa(cartaoId, quadraId, casa.id, { rua, antes, depois }, casas).catch(() => onErro?.())
  }

  function irPara(ruaCasas: Casa[], casa: Casa, indice: number) {
    const { antes, depois } = destinoDoMovimento(ruaCasas, casa.id, indice)
    mover(casa, casa.rua, antes, depois)
  }

  function aoSoltar(ruaCasas: Casa[], e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const de = ruaCasas.findIndex((c) => c.id === e.active.id)
    const para = ruaCasas.findIndex((c) => c.id === e.over?.id)
    if (de < 0 || para < 0) return
    const casa = ruaCasas[de]
    const nova = arrayMove(ruaCasas, de, para)
    irPara(ruaCasas, casa, nova.indexOf(casa))
  }

  function moverParaRua(casa: Casa, rua: string) {
    const fim = casas.filter((c) => c.rua === rua).at(-1) ?? null
    mover(casa, rua, fim, null)
    setMovendo(null)
    setAbertaId(null)
  }

  return <>
    <div className="aviso" role="note">
      <Icone nome="info" />
      <p>Segure uma casa e arraste para mudar a ordem. Os registros não mudam.</p>
    </div>
    {grupos.map((g) => <div key={g.rua}>
      <h2 className="titulo-secao">{g.rua} <small>{g.casas.length} {g.casas.length === 1 ? 'casa' : 'casas'}</small></h2>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => aoSoltar(g.casas, e)}>
        <SortableContext items={g.casas.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {g.casas.map((c) => <Linha
            key={c.id}
            casa={c}
            aberta={abertaId === c.id}
            podeMudarDeRua={nomes.length > 1}
            onAlternar={() => setAbertaId((atual) => (atual === c.id ? null : c.id))}
            onMudarDeRua={() => setMovendo(c)}
            onAdicionarDepois={() => onAdicionarDepois(c)}
          />)}
        </SortableContext>
      </DndContext>
    </div>)}
    {movendo && <FolhaMover casa={movendo} destinos={nomes.filter((r) => r !== movendo.rua)} onMover={(rua) => moverParaRua(movendo, rua)} onCancelar={() => setMovendo(null)} />}
  </>
}
