import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.stubEnv('VITE_NAVER_PROXY_URL', 'https://mock-proxy.workers.dev')

const { searchRestaurants } = await import('../services/naver')

const mockItems = [
  { title: '<b>맛있는</b>국밥', category: '한식', roadAddress: '서울 송파구', address: '', link: 'https://naver.com/1', mapx: '127', mapy: '37' },
  { title: '돼지<b>국밥</b>', category: '한식', roadAddress: '서울 송파구', address: '', link: 'https://naver.com/2', mapx: '127', mapy: '37' },
  { title: '해장국집', category: '한식', roadAddress: '서울 송파구', address: '', link: 'https://naver.com/3', mapx: '127', mapy: '37' },
]

describe('searchRestaurants', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('검색 결과 3개를 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    const results = await searchRestaurants('국밥')
    expect(results).toHaveLength(3)
  })

  it('HTML 태그를 제거한 식당명을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    const results = await searchRestaurants('국밥')
    expect(results[0].title).toBe('맛있는국밥')
    expect(results[1].title).toBe('돼지국밥')
  })

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })
    const results = await searchRestaurants('희귀한메뉴', 37.485, 127.122)
    expect(results).toEqual([])
  })

  it('API 실패 시 에러를 던진다', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    await expect(searchRestaurants('국밥', 37.485, 127.122)).rejects.toThrow()
  })

  it('roadAddress가 없으면 address를 사용한다', async () => {
    const itemWithoutRoad = [{ ...mockItems[0], roadAddress: '', address: '서울시 송파구 대체주소' }]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: itemWithoutRoad }),
    })
    const results = await searchRestaurants('국밥')
    expect(results[0].address).toBe('서울시 송파구 대체주소')
  })

  it('keywords 필드가 있으면 그대로 반환한다', async () => {
    const mockItemsWithKeywords = [
      {
        title: '맛있는국밥',
        category: '한식',
        roadAddress: '서울 송파구',
        address: '',
        link: 'https://map.naver.com/v5/entry/place/123',
        mapx: '127',
        mapy: '37',
        keywords: [
          { displayName: '음식이 맛있어요', iconUrl: 'https://ssl.pstatic.net/emoji1.png' },
          { displayName: '친절해요', iconUrl: 'https://ssl.pstatic.net/emoji2.png' },
        ],
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItemsWithKeywords }),
    })
    const results = await searchRestaurants('국밥')
    expect(results[0].keywords).toEqual(mockItemsWithKeywords[0].keywords)
  })

  it('keywords 필드가 없으면 빈 배열을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    const results = await searchRestaurants('국밥')
    expect(results[0].keywords).toEqual([])
  })
})
