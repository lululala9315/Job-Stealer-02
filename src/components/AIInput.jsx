/**
 * 역할: AI 스타일 입력창 — 원래 디자인 유지 + 애니메이션 플레이스홀더
 * 의존성: hooks/useAutoResizeTextarea, lib/utils, framer-motion
 */
import { useState, useEffect } from 'react'
import { CornerRightUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea'

export function AIInput({
  id = 'ai-input',
  placeholders = ['오늘 있었던 일을 적어주세요👻'],
  minHeight = 52,
  maxHeight = 300,
  onSubmit,
  className,
}) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight, maxHeight })
  const [inputValue, setInputValue] = useState('')
  const [isMultiLine, setIsMultiLine] = useState(false)

  // 플레이스홀더 순환 로직
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)

  useEffect(() => {
    if (placeholders.length <= 1) return
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [placeholders])

  function handleSubmit() {
    if (inputValue.trim().length < 2) return
    onSubmit?.(inputValue.trim())
    setInputValue('')
    setIsMultiLine(false)
    adjustHeight(true)
  }

  function checkMultiLine() {
    const el = textareaRef.current
    if (el) setIsMultiLine(el.scrollHeight > minHeight)
  }

  return (
    <div className={cn('w-full py-4', className)}>
      <div className="relative w-full">
        {/* 원래의 AIInput 스타일과 구조를 그대로 유지하는 textarea */}
        <textarea
          id={id}
          ref={textareaRef}
          value={inputValue}
          style={{ minHeight, maxHeight, height: minHeight, fontFamily: 'Pretendard, sans-serif' }}
          className={cn(
            'w-full bg-white rounded-3xl pl-6 pr-16',
            'border-none outline-none ring-1 ring-black/10',
            'text-black text-base leading-[1.2] py-[16px]',
            'overflow-y-auto resize-none',
            'focus:ring-[2.5px] focus:ring-black',
            'transition-[height] duration-100 ease-out',
            'relative z-0'
          )}
          onChange={(e) => {
            const val = e.target.value
            setInputValue(val)
            if (!val) {
              adjustHeight(true)
              setIsMultiLine(false)
            } else {
              adjustHeight()
              checkMultiLine()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />

        {/* 텍스트 입력 시 즉시 사라지는 애니메이션 플레이스홀더 오버레이 */}
        <div className="absolute inset-0 flex items-center pointer-events-none z-10 px-6 h-[52px]">
          <AnimatePresence>
            {!inputValue && (
              <motion.p
                key={currentPlaceholder}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{ duration: 0.2, ease: 'linear' }}
                className="text-black/30 text-base truncate select-none leading-none"
              >
                {placeholders[currentPlaceholder]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 제출 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          className={cn(
            'absolute right-3 rounded-full bg-black p-2 z-20',
            'transition-all duration-200',
            isMultiLine
              ? 'bottom-4'
              : 'top-[calc(50%-4px)] -translate-y-1/2',
            inputValue
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none',
          )}
        >
          <CornerRightUp className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
