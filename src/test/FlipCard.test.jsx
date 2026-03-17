import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

// vi.hoisted로 모킹 함수 먼저 선언 — vi.mock 팩토리보다 앞서 초기화되어야 함
const { mockFromTo, mockTo, mockSet, mockKillTweensOf, mockPause, mockResume } = vi.hoisted(() => {
  const mockPause = vi.fn()
  const mockResume = vi.fn()
  return {
    mockFromTo: vi.fn(),
    mockTo: vi.fn(),
    mockSet: vi.fn(),
    mockKillTweensOf: vi.fn(),
    mockPause,
    mockResume,
  }
})

vi.mock('gsap', () => ({
  default: {
    fromTo: (...args) => { mockFromTo(...args); return { pause: mockPause, resume: mockResume } },
    to: mockTo,
    set: mockSet,
    killTweensOf: mockKillTweensOf,
    utils: { random: vi.fn((min) => min) },
  },
}))

import FlipCard from '../components/FlipCard'

// matchMedia 모킹 — 기본: 호버 가능, reduced-motion 없음
const mockMatchMedia = (query) => ({
  matches: query.includes('hover: hover') ? true
    : query.includes('prefers-reduced-motion: reduce') ? false
    : false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})

beforeEach(() => {
  vi.stubGlobal('matchMedia', mockMatchMedia)
  mockFromTo.mockClear()
  mockTo.mockClear()
  mockSet.mockClear()
  mockKillTweensOf.mockClear()
  mockPause.mockClear()
  mockResume.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FlipCard', () => {
  it('마운트 시 GSAP 입장 애니메이션이 실행된다', () => {
    render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    expect(mockFromTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rotationY: -90, rotationZ: 0, y: '-4em' }),
      expect.objectContaining({ rotationY: 0, rotationZ: 6, y: '0em', duration: 1, ease: 'elastic.out(1, 0.75)' })
    )
  })

  it('prefers-reduced-motion이면 입장 애니메이션 없이 set으로 처리된다', () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query.includes('prefers-reduced-motion: reduce') ? true : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    expect(mockSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rotationZ: 6 }))
    expect(mockFromTo).not.toHaveBeenCalled()
  })

  it('언마운트 시 GSAP 정리 및 이벤트 리스너 제거가 호출된다', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    unmount()
    expect(mockKillTweensOf).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function))
  })

  it('카드에 마우스 진입 시 플로팅이 일시정지된다', () => {
    const { container } = render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    // onComplete 수동 실행 — 플로팅 tween 초기화
    const onComplete = mockFromTo.mock.calls[0]?.[2]?.onComplete
    onComplete?.()
    const scene = container.querySelector('[data-testid="card-scene"]')
    fireEvent.mouseEnter(scene)
    expect(mockPause).toHaveBeenCalled()
    expect(mockTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rotationY: 180, ease: 'power2.inOut' })
    )
  })

  it('카드에서 마우스 이탈 시 플로팅이 재개된다', () => {
    const { container } = render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    const onComplete = mockFromTo.mock.calls[0]?.[2]?.onComplete
    onComplete?.()
    const scene = container.querySelector('[data-testid="card-scene"]')
    fireEvent.mouseEnter(scene)
    fireEvent.mouseLeave(scene)
    expect(mockResume).toHaveBeenCalled()
    expect(mockTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rotationY: 0, rotationZ: 6, ease: 'power2.inOut' })
    )
  })
})
