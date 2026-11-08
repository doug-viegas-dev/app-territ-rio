import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import Logo from './Logo'

test('renderiza uma imagem decorativa com o tamanho pedido', () => {
  const { container } = render(<Logo tamanho={36} />)
  const img = container.querySelector('img')
  expect(img).not.toBeNull()
  expect(img?.getAttribute('alt')).toBe('')
  expect(img?.getAttribute('width')).toBe('36')
  expect(img?.getAttribute('height')).toBe('36')
})
