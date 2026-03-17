/**
 * 역할: 타이핑 애니메이션 훅 — 텍스트를 한 글자씩 표시
 * 주요 기능: ~50ms/글자 속도, 완료 콜백
 */
import { useState, useEffect, useRef } from 'react'

export function useTypingEffect(text, speed = 50) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!text) return

    // 새 텍스트가 들어오면 초기화
    setDisplayedText('')
    setIsComplete(false)
    indexRef.current = 0

    const interval = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current <= text.length) {
        setDisplayedText(text.slice(0, indexRef.current))
      } else {
        setIsComplete(true)
        clearInterval(interval)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return { displayedText, isComplete }
}
