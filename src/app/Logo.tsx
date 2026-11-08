import icone from '@/assets/icone.svg'

export default function Logo({ tamanho, className }: { tamanho: number; className?: string }) {
  return <img className={className} src={icone} alt="" width={tamanho} height={tamanho} style={{ flex: 'none' }} />
}
