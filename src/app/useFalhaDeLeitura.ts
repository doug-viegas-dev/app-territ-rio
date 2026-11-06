import { useCallback, useState } from 'react'

/** Devolve uma função que leva a falha de uma leitura (assíncrona) até o `ErroDeLeitura` mais próximo. */
export function useFalhaDeLeitura(): (e: Error) => void {
  const [, setEstado] = useState(0)
  return useCallback((e: Error) => setEstado(() => { throw e }), [])
}
