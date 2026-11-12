import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeloMarcas } from './SeloMarcas'

describe('SeloMarcas', () => {
  it('sem marcas não renderiza nada', () => {
    const { container } = render(<SeloMarcas casa={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra Não visitar com o ícone', () => {
    const { container } = render(<SeloMarcas casa={{ naoVisitar: true }} />)
    expect(container).toHaveTextContent('Não visitar')
    expect(container.querySelector('use[href="#i-nao-visitar"]')).not.toBeNull()
    expect(container.querySelector('use[href="#i-estudo"]')).toBeNull()
  })

  it('mostra Estudo com o ícone', () => {
    const { container } = render(<SeloMarcas casa={{ estudo: true }} />)
    expect(container).toHaveTextContent('Estudo')
    expect(container.querySelector('use[href="#i-estudo"]')).not.toBeNull()
    expect(container.querySelector('use[href="#i-nao-visitar"]')).toBeNull()
  })

  it('mostra as duas, Não visitar primeiro', () => {
    const { container } = render(<SeloMarcas casa={{ naoVisitar: true, estudo: true }} />)
    const selos = container.querySelectorAll('.selo')
    expect(selos).toHaveLength(2)
    expect(selos[0]).toHaveTextContent('Não visitar')
    expect(selos[1]).toHaveTextContent('Estudo')
  })
})
