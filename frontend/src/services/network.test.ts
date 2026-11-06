import { describe, expect, it } from 'vitest'
import { isConstrainedConnection, tileOrigin } from './network'

describe('isConstrainedConnection', () => {
  it('riconosce risparmio dati e reti 2G', () => {
    expect(isConstrainedConnection({ connection: { saveData: true } })).toBe(true)
    expect(isConstrainedConnection({ connection: { effectiveType: '2g' } })).toBe(true)
    expect(isConstrainedConnection({ connection: { effectiveType: 'slow-2g' } })).toBe(true)
  })
  it('con rete buona o API assente non limita', () => {
    expect(isConstrainedConnection({ connection: { effectiveType: '4g', saveData: false } })).toBe(false)
    expect(isConstrainedConnection({})).toBe(false)
  })
})

describe('tileOrigin', () => {
  it('ricava l\'origine dal modello di URL', () => {
    expect(tileOrigin('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=k')).toBe(
      'https://a.tile.thunderforest.com',
    )
    expect(tileOrigin('https://tile.opentopomap.org/{z}/{x}/{y}.png')).toBe('https://tile.opentopomap.org')
  })
  it('con un URL non valido restituisce null', () => {
    expect(tileOrigin('non-un-url')).toBeNull()
  })
})
