import { describe, expect, it } from 'vitest'
import { describeWeatherCode } from './weatherCode'

describe('describeWeatherCode', () => {
  it('descrive i codici principali', () => {
    expect(describeWeatherCode(0).label).toBe('Sereno')
    expect(describeWeatherCode(63).label).toBe('Pioggia')
    expect(describeWeatherCode(95).label).toBe('Temporale')
  })
  it('codice sconosciuto', () => {
    expect(describeWeatherCode(1234).label).toBe('Condizioni non disponibili')
  })
})
