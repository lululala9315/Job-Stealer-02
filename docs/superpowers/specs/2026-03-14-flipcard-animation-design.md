# FlipCard 애니메이션 개선 — 레퍼런스 기반 스펙

**작성일**: 2026-03-14
**대상 컴포넌트**: `src/components/FlipCard.jsx`
**레퍼런스**: https://www.eduardbodak.com/preis (hero-price_card-outer)

---

## 목표

레퍼런스 사이트의 카드 모션 디자인을 FlipCard에 정확히 재현한다.
대상 개선 항목: 입장 애니메이션, 레스팅 틸트, 플로팅, 마우스 트래킹, 반사 효과.

---

## 의존성

```bash
npm install gsap
```

elastic.out / sine.inOut easing은 CSS로 구현 불가하여 GSAP 필수.

---

## 1. 입장 애니메이션 (Entrance Animation)

컴포넌트 마운트 시 `useEffect`에서 GSAP 실행. 기존 CSS `card-entrance` 클래스 제거.

```javascript
gsap.fromTo(cardInnerRef.current,
  { rotationY: -90, rotationZ: 0, y: '-4em' },
  {
    rotationY: 0, rotationZ: 6, y: '0em',
    duration: 1,
    ease: 'elastic.out(1, 0.75)',
    onComplete: initAnimation,
  }
)
```

| 속성 | 시작값 | 종료값 |
|------|--------|--------|
| `rotationY` | -90deg | 0deg |
| `rotationZ` | 0deg | 6deg |
| `y` | -4em | 0em |
| `duration` | — | 1s |
| `ease` | — | elastic.out(1, 0.75) |

**reduced-motion 처리**: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`가 true이면 애니메이션 없이 즉시 `rotationZ: 6` 상태로 세팅 후 `initAnimation()` 호출.

---

## 2. 레스팅 틸트 (Resting State)

입장 완료 후 평소 상태: `rotationZ: 6deg` 고정.
X/Y 회전 없음. Z축만 살짝 기울어진 채로 유지.

---

## 3. 플로팅 애니메이션 (Floating)

`initAnimation()` 내에서 시작. tween 참조는 `floatingTweenRef`(useRef)에 저장하여 pause/resume 가능하게 관리.

```javascript
floatingTweenRef.current = gsap.fromTo(cardInnerRef.current,
  { yPercent: -3 },
  {
    yPercent: 3,
    duration: () => gsap.utils.random(1.5, 2.5),
    ease: 'sine.inOut',
    repeat: -1,
    repeatRefresh: true,
    yoyo: true,
  }
)
```

**reduced-motion 처리**: `prefers-reduced-motion: reduce` 시 플로팅 실행하지 않음.

| 속성 | 값 |
|------|----|
| yPercent 범위 | -3 ~ 3 |
| duration | 1.5~2.5s (매 사이클 랜덤) |
| ease | sine.inOut |
| repeat | -1 (무한) |
| yoyo | true |
| repeatRefresh | true |

---

## 4. 마우스 트래킹 틸트

**적용 조건**: `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)` 모두 만족하는 데스크톱 환경에서만 활성화.

**플립과의 충돌 해결**: 마우스 트래킹은 `rotationY`를 제어하고, 기존 Y축 플립도 `rotationY: 180deg`를 사용한다. 두 애니메이션이 동일 속성을 경쟁하므로, **플립 상태(`flipped === true`)일 때는 마우스 트래킹을 비활성화**한다. 마우스 이동 핸들러 시작 부분에서 `if (flipped) return` 처리.

**마우스 이동 시:**
```javascript
const handleMouseMove = (e) => {
  if (flipped) return  // 플립 상태에서는 트래킹 비활성화
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
```

**마우스 이탈 시:**
```javascript
const handleMouseLeave = () => {
  gsap.to(cardInnerRef.current, {
    rotationY: 0,
    rotationZ: 6,
    duration: 1.5,
    ease: 'elastic.out(1, 0.75)',
  })
}
```

참고: `rotationX`는 레퍼런스 마우스 트래킹에 사용되지 않으므로 포함하지 않음.

**이벤트 등록**: `window` 기준 `mousemove` / `mouseleave` 이벤트. `initAnimation()` 내에서 등록.

---

## 5. 호버 상태 처리

기존 `useState(flipped)` Y축 플립 로직 유지.

호버 진입 시:
- `floatingTweenRef.current.pause()` — 플로팅 일시정지
- `setFlipped(true)` — Y축 플립 시작

호버 이탈 시:
- `setFlipped(false)` — 플립 복귀
- `floatingTweenRef.current.resume()` — 플로팅 재개

---

## 6. 반사 효과 (Reflection)

반사 DOM은 정적 복제본으로 유지. GSAP 연동 없음(카드가 움직여도 반사는 제자리). 그라데이션 마스크만 레퍼런스 기반으로 교체.

현재:
```javascript
background: 'linear-gradient(to bottom, rgba(250,250,242,0.55) 0%, rgba(250,250,242,1) 75%)'
```

변경:
```javascript
background: 'linear-gradient(to bottom, rgba(250,250,242,0) 0%, rgba(250,250,242,0.76) 9%, rgba(250,250,242,0.9) 16%, rgba(250,250,242,0.97) 22%, rgba(250,250,242,1) 32%)'
```

---

## 7. 언마운트 정리 (Cleanup)

```javascript
useEffect(() => {
  // ... 애니메이션 초기화 코드

  return () => {
    gsap.killTweensOf(cardInnerRef.current)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseleave', handleMouseLeave)
  }
}, [])
```

---

## 8. Ref 목록

| ref | 대상 | 용도 |
|-----|------|------|
| `cardInnerRef` | 3D 회전 div (현재 transform 적용 div) | GSAP 타겟 |
| `floatingTweenRef` | GSAP tween 인스턴스 | pause/resume |

---

## 9. 기존 기능 유지 항목

- L자 코너 브래킷: 변경 없음
- 앞/뒷면 콘텐츠: 변경 없음
- 반사 DOM 구조: 유지, 그라데이션만 교체
- CSS `card-entrance` 클래스: **GSAP 입장으로 대체하여 제거**

---

## 10. 범위 외 (Out of Scope)

- 카드 앞면 레이아웃/콘텐츠 변경
- RestaurantCard 애니메이션
- 스크롤 트리거 애니메이션
