import { describe, it, expect } from 'vitest'
import { extractPlaceId, scoreRelevance } from './worker.js'

describe('scoreRelevance', () => {
  it('업체명에 키워드 포함 시 2점 반환', () => {
    expect(scoreRelevance({ title: '마라탕마라탕 문정점', category: '중식' }, '마라탕')).toBe(2)
  })

  it('HTML 태그 제거 후 업체명 매칭', () => {
    expect(scoreRelevance({ title: '<b>마라탕</b>집', category: '중식' }, '마라탕')).toBe(2)
  })

  it('카테고리에만 키워드 포함 시 1점 반환', () => {
    expect(scoreRelevance({ title: '행복식당', category: '마라탕,중식' }, '마라탕')).toBe(1)
  })

  it('제목/카테고리 모두 미포함 시 0점 반환', () => {
    expect(scoreRelevance({ title: '해물왕국', category: '해산물' }, '마라탕')).toBe(0)
  })

  it('menuKeyword가 없으면 0점 반환', () => {
    expect(scoreRelevance({ title: '마라탕집', category: '중식' }, '')).toBe(0)
  })
})

describe('extractPlaceId', () => {
  it('map.naver.com/v5 URL에서 placeId를 추출한다', () => {
    expect(extractPlaceId('https://map.naver.com/v5/entry/place/1719610577')).toBe('1719610577')
  })

  it('map.naver.com/p URL에서 placeId를 추출한다', () => {
    expect(extractPlaceId('https://map.naver.com/p/entry/place/18872410')).toBe('18872410')
  })

  it('place/ 없는 URL은 null 반환', () => {
    expect(extractPlaceId('https://naver.com/some/path')).toBeNull()
  })

  it('link가 null이면 null 반환', () => {
    expect(extractPlaceId(null)).toBeNull()
  })

  it('link가 undefined이면 null 반환', () => {
    expect(extractPlaceId(undefined)).toBeNull()
  })
})
