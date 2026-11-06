import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import App from './App'

test('mostra o nome do aplicativo', () => {
  render(<App />)
  expect(screen.getByText('Meu Território')).toBeTruthy()
})

