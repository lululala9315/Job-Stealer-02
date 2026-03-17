/**
 * 역할: joguman.com 방식 커스텀 커서 — cursor:none 위에 SVG 이미지 오버레이
 * 주요 기능: rAF 기반 마우스 추적, 인터랙티브 요소 감지 시 pointer SVG 전환
 */
import { useEffect, useRef } from 'react'

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select', 'label'])

function isInteractive(el) {
  if (!el || el === document.documentElement || el === document.body) return false
  if (INTERACTIVE_TAGS.has(el.tagName?.toLowerCase())) return true
  if (el.getAttribute?.('role') === 'button') return true
  if (el.classList?.contains('cursor-pointer')) return true
  return isInteractive(el.parentElement)
}

export default function CustomCursor() {
  const cursorRef = useRef(null)

  useEffect(() => {
    const el = cursorRef.current
    if (!el) return

    // 브라우저 기본 커서를 확실하게 숨기기 위한 투명 GIF (none이 무시되는 브라우저 버그 방어용)
    const HIDE_CURSOR_STYLE = "url('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), none"

    // JS로 전역 스타일 강제 주입
    document.documentElement.style.setProperty('cursor', HIDE_CURSOR_STYLE, 'important')
    document.body.style.setProperty('cursor', HIDE_CURSOR_STYLE, 'important')

    let x = -100, y = -100
    let rafId = null

    function render() {
      el.style.transform = `translate(${x}px, ${y}px)`
      rafId = null
    }

    function onMouseMove(e) {
      // 마우스 이동 시마다 body/html의 cursor 상태를 다시 강제 (애니메이션/필터 간섭 방어)
      if (!document.body.style.cursor.includes('data:image/gif')) {
        document.body.style.setProperty('cursor', HIDE_CURSOR_STYLE, 'important')
        document.documentElement.style.setProperty('cursor', HIDE_CURSOR_STYLE, 'important')
      }

      const target = document.elementFromPoint(e.clientX, e.clientY)
      const pointer = isInteractive(target)
      const hot = pointer ? 14 : 12

      x = e.clientX - hot
      y = e.clientY - hot

      el.style.backgroundImage = pointer
        ? "url('/cursor_pointer.svg')"
        : "url('/cursor_default.svg')"

      // rAF으로 transform 업데이트 — 불필요한 레이아웃 재계산 방지
      if (!rafId) rafId = requestAnimationFrame(render)
    }

    function onMouseLeave() {
      x = -100
      y = -100
      if (!rafId) rafId = requestAnimationFrame(render)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      if (rafId) cancelAnimationFrame(rafId)

      // 언마운트 시 스타일 복구
      document.body.style.cursor = ''
      document.documentElement.style.cursor = ''
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 46,
        height: 46,
        backgroundImage: "url('/cursor_default.svg')",
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top left',
        pointerEvents: 'none',
        zIndex: 999999,
        transform: 'translate(-100px, -100px)',
        willChange: 'transform',
      }}
    />
  )
}
