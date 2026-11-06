export function gerarFaixa(inicio: number, fim: number, paridade: 'todos' | 'pares' | 'impares'): string[] {
  if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fim)) throw new Error('Informe números inteiros válidos')
  const resultado: string[] = []
  for (let n = inicio; n <= fim; n++) {
    if (paridade === 'pares' && n % 2 !== 0) continue
    if (paridade === 'impares' && n % 2 === 0) continue
    if (resultado.length === 200) throw new Error('Faixa grande demais')
    resultado.push(String(n))
  }
  return resultado
}

