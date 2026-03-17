/**
 * 역할: textarea 높이 자동 조절 훅
 */
import { useRef, useCallback } from 'react'

export function useAutoResizeTextarea({ minHeight = 52, maxHeight = 200 }) {
  const textareaRef = useRef(null)

  const adjustHeight = useCallback((reset = false) => {
    const el = textareaRef.current
    if (!el) return
    if (reset) {
      el.style.height = `${minHeight}px`
      return
    }
    el.style.height = `${minHeight}px`
    const scrollHeight = el.scrollHeight
    el.style.height = `${Math.min(scrollHeight, maxHeight)}px`
  }, [minHeight, maxHeight])

  return { textareaRef, adjustHeight }
}
