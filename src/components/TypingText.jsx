/**
 * 역할: 타이핑 효과 텍스트 렌더링
 * 의존성: hooks/useTypingEffect
 */
import { useTypingEffect } from '../hooks/useTypingEffect'

export default function TypingText({ text, color = '#1F2327' }) {
  const { displayedText, isComplete } = useTypingEffect(text)

  return (
    <p
      className="text-base leading-relaxed"
      style={{ fontFamily: 'Pretendard, sans-serif', color }}
    >
      {displayedText}
      {!isComplete && <span className="typing-cursor" />}
    </p>
  )
}
