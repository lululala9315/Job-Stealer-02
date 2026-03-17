import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InputScreen from '../components/InputScreen'

describe('InputScreen', () => {
  it('질문 텍스트가 렌더링된다', () => {
    render(<InputScreen onSubmit={() => {}} />)
    expect(screen.getByText(/맛집을 찾아드릴게요/)).toBeInTheDocument()
  })

  it('감정 분석하기 버튼이 없다', () => {
    render(<InputScreen onSubmit={() => {}} />)
    expect(screen.queryByRole('button', { name: '감정 분석하기' })).not.toBeInTheDocument()
  })

  it('Enter 키를 누르면 onSubmit이 호출된다', () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText(/오늘 있었던 일/)
    fireEvent.change(textarea, { target: { value: '오늘 너무 힘들어' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSubmit).toHaveBeenCalledWith('오늘 너무 힘들어')
  })

  it('Shift+Enter는 줄바꿈이므로 onSubmit이 호출되지 않는다', () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText(/오늘 있었던 일/)
    fireEvent.change(textarea, { target: { value: '오늘 너무 힘들어' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('2글자 미만이면 Enter 키를 눌러도 onSubmit이 호출되지 않는다', () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText(/오늘 있었던 일/)
    fireEvent.change(textarea, { target: { value: '아' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('공백만 입력 후 Enter를 눌러도 onSubmit이 호출되지 않는다', () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText(/오늘 있었던 일/)
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
