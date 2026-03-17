import { describe, it, expect, vi, beforeEach } from 'vitest'

// fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// 환경변수 모킹 — classifyEmotion은 Worker 프록시(/classify)를 경유
vi.stubEnv('VITE_NAVER_PROXY_URL', 'https://mock-proxy.workers.dev')

const { classifyEmotion } = await import('../services/gemini')

describe('classifyEmotion', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('분노 텍스트를 anger로 분류한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ emotion: 'anger' }),
    })
    const result = await classifyEmotion('너무 열받아')
    expect(result).toBe('anger')
  })

  it('유효하지 않은 응답은 anxiety로 fallback한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ emotion: '잘 모르겠어요' }),
    })
    const result = await classifyEmotion('테스트')
    expect(result).toBe('anxiety')
  })

  it('응답에 키워드가 포함된 경우 부분 매칭한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ emotion: 'the emotion is burnout.' }),
    })
    const result = await classifyEmotion('지쳐서 아무것도 하기 싫어')
    expect(result).toBe('burnout')
  })

  it('API 실패 시 에러를 던진다', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    await expect(classifyEmotion('테스트')).rejects.toThrow()
  })

  it('5가지 유효한 감정 키 중 하나를 반환한다', async () => {
    const validEmotions = ['anger', 'depression', 'burnout', 'joy', 'anxiety']
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ emotion: 'joy' }),
    })
    const result = await classifyEmotion('오늘 너무 행복해!')
    expect(validEmotions).toContain(result)
  })
})
