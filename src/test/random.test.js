import { describe, it, expect } from 'vitest'
import { pickRandom } from '../utils/random'

describe('pickRandom', () => {
  it('배열에서 요소를 반환한다', () => {
    const arr = ['a', 'b', 'c']
    const result = pickRandom(arr)
    expect(arr).toContain(result)
  })

  it('배열 요소 중 하나만 반환한다', () => {
    const arr = [1, 2, 3]
    const result = pickRandom(arr)
    expect(typeof result).toBe('number')
  })

  it('단일 요소 배열이면 그 요소를 반환한다', () => {
    expect(pickRandom(['only'])).toBe('only')
  })

  it('여러 번 호출하면 다양한 결과를 반환한다', () => {
    const arr = ['a', 'b', 'c', 'd', 'e']
    const results = new Set(Array.from({ length: 20 }, () => pickRandom(arr)))
    expect(results.size).toBeGreaterThan(1)
  })
})
