import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const identidade = join(raiz, 'design', 'identidade')
const icons = join(raiz, 'public', 'icons')

const saidas = [
  { svg: 'icone.svg', arquivo: 'icon-192.png', lado: 192 },
  { svg: 'icone.svg', arquivo: 'icon-512.png', lado: 512 },
  { svg: 'icone-maskable.svg', arquivo: 'maskable-512.png', lado: 512 },
]

mkdirSync(icons, { recursive: true })
for (const { svg, arquivo, lado } of saidas) {
  const png = new Resvg(readFileSync(join(identidade, svg)), { fitTo: { mode: 'width', value: lado } }).render().asPng()
  writeFileSync(join(icons, arquivo), png)
  console.log(`public/icons/${arquivo} (${lado}x${lado})`)
}
copyFileSync(join(identidade, 'icone.svg'), join(raiz, 'public', 'favicon.svg'))
console.log('public/favicon.svg')
