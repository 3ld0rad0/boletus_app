import { describe, expect, it } from 'vitest'
import { markSeen, pickUnseen } from './pickUnseen'

const items = ['a', 'b', 'c']
const id = (s: string) => s

describe('pickUnseen', () => {
  it('sceglie solo tra i non visti', () => {
    expect(pickUnseen(items, id, ['a', 'c'], () => 0)).toBe('b')
    expect(pickUnseen(items, id, ['a'], () => 0.99)).toBe('c')
  })
  it('visti tutti: ricomincia senza ripetere l\'ultimo', () => {
    expect(pickUnseen(items, id, ['a', 'b', 'c'], () => 0)).toBe('a')
    expect(pickUnseen(items, id, ['c', 'a', 'b'], () => 0.99)).toBe('c')
    expect(pickUnseen(items, id, ['a', 'b', 'c'], () => 0.99)).toBe('b')
  })
  it('un solo elemento: lo ripete', () => {
    expect(pickUnseen(['x'], id, ['x'], () => 0)).toBe('x')
  })
  it('random a 1 non esce dai limiti', () => {
    expect(pickUnseen(items, id, [], () => 1)).toBe('c')
  })
})

describe('markSeen', () => {
  it('aggiunge senza duplicati', () => {
    expect(markSeen(items, id, ['a'], 'b')).toEqual(['a', 'b'])
    expect(markSeen(items, id, ['a', 'b'], 'b')).toEqual(['a', 'b'])
  })
  it('visti tutti: riparte dall\'ultimo', () => {
    expect(markSeen(items, id, ['a', 'b', 'c'], 'a')).toEqual(['a'])
  })
})
