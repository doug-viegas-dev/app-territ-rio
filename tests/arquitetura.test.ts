import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test } from 'vitest'

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return path === join('src', 'firebase') ? [] : arquivos(path)
    return /(?<!\.test)\.tsx?$/.test(entry.name) ? [path] : []
  })
}

test('acesso ao Firebase fica em src/firebase', () => {
  const arquivosQueImportamFirebase = arquivos('src')
    .filter((file) => /(?:from\s*|import\s*\(\s*|import\s*)["\x27]firebase\//.test(readFileSync(file, 'utf8')))
    .map((file) => relative('.', file))
  expect(arquivosQueImportamFirebase).toEqual([])
})
