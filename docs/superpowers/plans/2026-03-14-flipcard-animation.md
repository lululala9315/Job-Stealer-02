# FlipCard 애니메이션 개선 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GSAP을 사용해 FlipCard의 입장 애니메이션, 레스팅 틸트, 플로팅, 마우스 트래킹, 반사 그라데이션을 레퍼런스(eduardbodak.com/preis)와 정확히 일치시킨다.

**Architecture:** FlipCard.jsx를 GSAP 기반으로 재작성한다. CSS `card-entrance` 클래스는 FlipCard에서 제거하고 GSAP `fromTo`로 대체한다. 마우스 트래킹은 window 이벤트로 등록하고, flipped 상태는 useRef로 이벤트 핸들러 내에서 접근한다.

**Tech Stack:** React 19, GSAP 3, Vitest + React Testing Library

---

## Chunk 1: GSAP 설치 및 FlipCard 재작성

### Task 1: GSAP 설치

**Files:**
- Modify: `package.json` (의존성 추가)

- [ ] **Step 1: GSAP 설치**

```bash
cd /Users/haeunlee/Desktop/claude/02_맛집추천
npm install gsap
```

Expected output: `added 1 package` (또는 유사)

- [ ] **Step 2: 설치 확인**

```bash
node -e "require('gsap'); console.log('gsap ok')"
```

Expected: `gsap ok`

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "GSAP 설치 — FlipCard 애니메이션 레퍼런스 재현을 위해"
```

---

### Task 2: FlipCard 테스트 작성 (TDD — 실패 먼저)

**Files:**
- Create: `src/test/FlipCard.test.jsx`

- [ ] **Step 1: 테스트 파일 작성**

`src/test/FlipCard.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FlipCard from '../components/FlipCard'

// GSAP 모킹
const mockFromTo = vi.fn()
const mockTo = vi.fn()
const mockSet = vi.fn()
const mockKillTweensOf = vi.fn()
const mockPause = vi.fn()
const mockResume = vi.fn()

vi.mock('gsap', () => ({
  default: {
    fromTo: (...args) => { mockFromTo(...args); return { pause: mockPause, resume: mockResume } },
    to: mockTo,
    set: mockSet,
    killTweensOf: mockKillTweensOf,
    utils: { random: vi.fn((min) => min) },
  },
}))

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

  it('카드에 마우스 진입 시 플로팅이 일시정지된다', async () => {
    const { container } = render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    // onComplete 수동 실행 — 플로팅 tween 초기화
    const onComplete = mockFromTo.mock.calls[0]?.[2]?.onComplete
    onComplete?.()
    const scene = container.querySelector('[data-testid="card-scene"]')
    fireEvent.mouseEnter(scene)
    expect(mockPause).toHaveBeenCalled()
  })

  it('카드에서 마우스 이탈 시 플로팅이 재개된다', async () => {
    const { container } = render(<FlipCard keyword="라멘" reason="테스트" categoryImage="/test.png" emotionImage="/e.svg" />)
    const onComplete = mockFromTo.mock.calls[0]?.[2]?.onComplete
    onComplete?.()
    const scene = container.querySelector('[data-testid="card-scene"]')
    fireEvent.mouseEnter(scene)
    fireEvent.mouseLeave(scene)
    expect(mockResume).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test -- FlipCard
```

Expected: FAIL (FlipCard.jsx가 아직 GSAP을 사용하지 않으므로)

> **Mock 동작 참고**: `mockFromTo`는 항상 동일한 `{ pause: mockPause, resume: mockResume }` 객체를 반환한다. 입장 애니메이션(1번째 호출)과 플로팅(2번째 호출) 모두 같은 mock 반환값을 공유하므로, `floatingTweenRef.current.pause()` 테스트는 mock 관점에서 정상 동작한다. `mockFromTo.mock.calls[0]?.[2]?.onComplete`로 `initAnimation`을 수동 실행해야 플로팅 tween이 초기화된다.

---

### Task 3: FlipCard.jsx GSAP으로 재작성

**Files:**
- Modify: `src/components/FlipCard.jsx`

- [ ] **Step 1: FlipCard.jsx 전체 교체**

`src/components/FlipCard.jsx`:
```jsx
/**
 * 역할: 3D 플립 카드 — 앞면(카테고리 이미지+메뉴명+추천이유) / 뒷면(감정 이미지)
 * 주요 기능: GSAP 기반 입장 애니메이션, 플로팅, 마우스 트래킹 틸트, hover Y축 플립, 바닥 반사
 * 참고: https://www.eduardbodak.com/preis 카드 디자인 기반 — 레퍼런스 수치 그대로 사용
 */
import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'

/** 레퍼런스 동일 L자형 코너 브래킷 — CSS scale로 4방향 회전 */
const CornerBracket = ({ style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 93 93"
    width="20"
    height="20"
    style={{ position: 'absolute', ...style }}
    aria-hidden="true"
  >
    <path fill="currentColor" d="M31 0h62v31H62v31H31v31H0V31h31V0Z" />
  </svg>
)

/** 카드 앞면 콘텐츠 — 실제 카드와 반사 둘 다 사용 */
function CardFrontContent({ keyword, reason, categoryImage, color }) {
  return (
    <>
      <CornerBracket style={{ top: 0, left: 0, color, transform: 'none' }} />
      <CornerBracket style={{ top: 0, right: 0, color, transform: 'scale(-1, 1)' }} />
      <CornerBracket style={{ bottom: 0, left: 0, color, transform: 'scale(1, -1)' }} />
      <CornerBracket style={{ bottom: 0, right: 0, color, transform: 'scale(-1, -1)' }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 8px' }}>
        <img
          src={categoryImage || '/images/category/공통.png'}
          alt={keyword}
          style={{ maxHeight: '185px', objectFit: 'contain' }}
          onError={e => { e.currentTarget.src = `/images/category/${encodeURIComponent('공통')}.png` }}
        />
      </div>

      <div style={{ padding: '10px 20px 24px' }}>
        <p style={{ fontFamily: 'MemomentKkukkukk, sans-serif', fontSize: '26px', color, marginBottom: '5px', lineHeight: 1.2 }}>
          {keyword}
        </p>
        {reason && (
          <p style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '11.5px', color: color === '#1F2327' ? '#666' : 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>
            {reason}
          </p>
        )}
      </div>
    </>
  )
}

const CARD_W = 260
const CARD_H = 358

export default function FlipCard({ keyword, reason, categoryImage, emotionImage }) {
  const [flipped, setFlipped] = useState(false)

  // 이벤트 핸들러 클로저 내에서 최신 flipped 값 접근용 — React state는 클로저에 고정됨
  const flippedRef = useRef(false)
  const cardInnerRef = useRef(null)
  const floatingTweenRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 마우스 트래킹은 데스크톱 hover 환경에서만 활성화
    const canHover = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    ).matches

    function handleMouseMove(e) {
      // 플립 상태에서는 rotationY 경쟁 방지를 위해 트래킹 비활성화
      if (flippedRef.current) return
      const normalizedX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
      const rotationY = normalizedX * 200
      const rotationProgress = Math.min(Math.abs(rotationY) / 180, 1)
      const rotationZ = 6 - rotationProgress * 12

      gsap.to(cardInnerRef.current, {
        rotationY,
        rotationZ,
        duration: 0.5,
        ease: 'power2.out',
      })
    }

    function handleMouseLeave() {
      // 마우스가 윈도우 밖으로 나갈 때 기본 레스팅 상태로 복귀
      gsap.to(cardInnerRef.current, {
        rotationY: 0,
        rotationZ: 6,
        duration: 1.5,
        ease: 'elastic.out(1, 0.75)',
      })
    }

    function initAnimation() {
      // reduced-motion이 아닐 때만 플로팅 실행
      if (!prefersReducedMotion) {
        floatingTweenRef.current = gsap.fromTo(
          cardInnerRef.current,
          { yPercent: -3 },
          {
            yPercent: 3,
            duration: () => gsap.utils.random(1.5, 2.5),
            ease: 'sine.inOut',
            repeat: -1,
            repeatRefresh: true, // 매 사이클마다 duration 재생성 — 속도 변화감
            yoyo: true,
          }
        )
      }

      if (canHover) {
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)
      }
    }

    if (prefersReducedMotion) {
      // 접근성: 애니메이션 없이 즉시 최종 상태로
      gsap.set(cardInnerRef.current, { rotationZ: 6 })
      initAnimation()
    } else {
      // 레퍼런스 입장 애니메이션 — rotationY -90→0, rotationZ 0→6, y -4em→0
      gsap.fromTo(
        cardInnerRef.current,
        { rotationY: -90, rotationZ: 0, y: '-4em' },
        {
          rotationY: 0,
          rotationZ: 6,
          y: '0em',
          duration: 1,
          ease: 'elastic.out(1, 0.75)',
          onComplete: initAnimation,
        }
      )
    }

    return () => {
      gsap.killTweensOf(cardInnerRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const handleMouseEnter = () => {
    flippedRef.current = true
    setFlipped(true)
    floatingTweenRef.current?.pause()
  }

  const handleMouseLeaveCard = () => {
    flippedRef.current = false
    setFlipped(false)
    floatingTweenRef.current?.resume()
  }

  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* 카드 씬 — perspective 적용 + hover 이벤트 */}
      <div
        data-testid="card-scene"
        style={{ perspective: '150svh', perspectiveOrigin: '50% 0', width: CARD_W, height: CARD_H }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeaveCard}
      >
        {/* GSAP 타겟 — rotationY/Z/yPercent 모두 이 요소에 적용 */}
        <div
          ref={cardInnerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : undefined,
            cursor: 'pointer',
          }}
        >
          {/* 앞면 */}
          <div style={{ ...faceStyle, backgroundColor: '#FAFAF2', border: '1.5px solid #1F2327' }}>
            <CardFrontContent keyword={keyword} reason={reason} categoryImage={categoryImage} color="#1F2327" />
          </div>

          {/* 뒷면 */}
          <div style={{ ...faceStyle, backgroundColor: '#1F2327', transform: 'rotateY(180deg)' }}>
            {emotionImage && (
              <img src={emotionImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <CornerBracket style={{ top: 0, left: 0, color: '#fff', transform: 'none' }} />
            <CornerBracket style={{ top: 0, right: 0, color: '#fff', transform: 'scale(-1, 1)' }} />
            <CornerBracket style={{ bottom: 0, left: 0, color: '#fff', transform: 'scale(1, -1)' }} />
            <CornerBracket style={{ bottom: 0, right: 0, color: '#fff', transform: 'scale(-1, -1)' }} />
          </div>
        </div>
      </div>

      {/* 바닥 반사 — 레퍼런스 기반 그라데이션 마스크 */}
      <div
        style={{
          width: CARD_W,
          height: CARD_H * 0.35,
          position: 'relative',
          overflow: 'hidden',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      >
        {/* 앞면 복제본 — scaleY(-1)로 뒤집어 반사 표현 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            transformOrigin: 'top center',
            transform: 'scaleY(-1)',
            backgroundColor: '#FAFAF2',
            border: '1.5px solid #1F2327',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardFrontContent keyword={keyword} reason={reason} categoryImage={categoryImage} color="#1F2327" />
        </div>

        {/* 레퍼런스 기반 그라데이션 마스크 — 위쪽(반사 시작)은 투명, 빠르게 불투명으로 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(250,250,242,0) 0%, rgba(250,250,242,0.76) 9%, rgba(250,250,242,0.9) 16%, rgba(250,250,242,0.97) 22%, rgba(250,250,242,1) 32%)',
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FlipCard에서 card-entrance 클래스가 제거됐는지 확인**

```bash
grep -n "card-entrance" /Users/haeunlee/Desktop/claude/02_맛집추천/src/components/FlipCard.jsx
```

Expected: 출력 없음 (위 코드에 className="card-entrance" 없음)

`src/index.css`의 `.card-entrance` 정의는 유지 (다른 컴포넌트에서 사용될 수 있음)

- [ ] **Step 3: 테스트 실행 — 통과 확인**

```bash
npm run test -- FlipCard
```

Expected: PASS (5개 테스트 모두)

- [ ] **Step 4: 커밋**

```bash
git add src/components/FlipCard.jsx src/test/FlipCard.test.jsx
git commit -m "FlipCard GSAP 애니메이션 적용 — 레퍼런스(eduardbodak.com) 수치 재현"
```

---

### Task 4: 브라우저 동작 확인

**Files:** 없음 (수동 검증)

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: 브라우저에서 확인할 항목**

`http://localhost:5173` 접속 후 텍스트 입력 → 결과 화면에서:

| 항목 | 기대 동작 |
|------|-----------|
| 입장 | 카드가 왼쪽에서 회전하며 등장, 도착 시 탄성(bounce) |
| 레스팅 틸트 | 카드가 Z축 6도 기울어진 채로 정지 |
| 플로팅 | 카드가 위아래로 천천히 떠다님 |
| 마우스 이동 | 화면 X 위치에 따라 카드가 Y축으로 기울어짐 |
| 카드 hover | 플로팅 멈추고 뒷면으로 뒤집힘 |
| 카드 unhover | 앞면으로 복귀, 플로팅 재개 |
| 마우스 윈도우 이탈 | 카드가 기본 각도로 탄성 복귀 |
| 반사 | 투명→불투명 전환이 빠르게 일어남 (기존보다 짧게) |

- [ ] **Step 3: 마무리 커밋**

시각적 확인 후 추가 수정사항이 있으면 커밋:

```bash
git add src/components/FlipCard.jsx
git commit -m "FlipCard 시각 검증 후 미세 조정"
```

수정사항 없으면 이 단계 스킵.
