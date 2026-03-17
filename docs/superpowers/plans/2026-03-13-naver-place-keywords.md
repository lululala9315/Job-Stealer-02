# 네이버 플레이스 방문자 키워드 표시 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맛집 카드 주소 아래에 네이버 플레이스 방문자 키워드 상위 3개를 이모지 + 텍스트 배지로 표시한다.

**Architecture:** Cloudflare Worker의 `/search` 핸들러에서 local.json 결과를 받은 후, 각 업체의 placeId를 추출해 `pcmap-api.place.naver.com/graphql`에 병렬 요청으로 키워드 통계를 가져온다. 클라이언트는 기존과 동일하게 `/search` 한 번만 호출하고, enriched 데이터를 받아 RestaurantCard에 keywords prop으로 전달한다.

**Tech Stack:** Cloudflare Workers, GraphQL (POST), Vitest, React 19, Tailwind CSS v4

**Note:** `extractPlaceId`는 순수 함수라 vitest로 단위 테스트 가능. `fetchPlaceKeywords`는 Cloudflare Workers 런타임에 의존하므로 vitest 단위 테스트 대신 wrangler dev + curl로 통합 검증한다.

---

## Chunk 1: Worker — placeId 추출 + 키워드 fetch

### Task 1: Worker에 키워드 fetch 로직 추가

**Files:**
- Modify: `proxy/worker.js`
- Create: `proxy/worker.test.js`

- [ ] **Step 1: `extractPlaceId` 단위 테스트 작성**

`proxy/worker.test.js` 파일을 생성한다. `extractPlaceId`는 순수 함수이므로 vitest로 테스트 가능.

```js
import { describe, it, expect } from 'vitest'

// extractPlaceId를 테스트하기 위해 직접 정의 (worker.js에서 export 추가 후 import로 변경 가능)
function extractPlaceId(link) {
  const match = link?.match(/place\/(\d+)/)
  return match?.[1] ?? null
}

describe('extractPlaceId', () => {
  it('map.naver.com URL에서 placeId를 추출한다', () => {
    expect(extractPlaceId('https://map.naver.com/v5/entry/place/1719610577')).toBe('1719610577')
  })

  it('place/ 없는 URL은 null 반환', () => {
    expect(extractPlaceId('https://naver.com/some/path')).toBeNull()
  })

  it('link가 null이면 null 반환', () => {
    expect(extractPlaceId(null)).toBeNull()
  })

  it('link가 undefined이면 null 반환', () => {
    expect(extractPlaceId(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
cd /Users/haeunlee/Desktop/claude/02_맛집추천
npm run test:run -- worker
```

Expected: FAIL (`extractPlaceId is not defined`)

- [ ] **Step 3: `extractPlaceId` + `fetchPlaceKeywords` Worker에 추가**

`proxy/worker.js` 상단(export default 위)에 두 함수를 추가한다.

```js
/** link URL에서 네이버 플레이스 ID 추출 */
function extractPlaceId(link) {
  const match = link?.match(/place\/(\d+)/)
  return match?.[1] ?? null
}

/** 네이버 플레이스 GraphQL로 방문자 키워드 상위 3개 조회
 *  실패 시 빈 배열 반환 — 키워드 없어도 검색 결과는 정상 표시
 */
async function fetchPlaceKeywords(placeId) {
  if (!placeId) return []
  try {
    const res = await fetch('https://pcmap-api.place.naver.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://map.naver.com/',
        'Origin': 'https://map.naver.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        operationName: 'getVisitorReviewStats',
        variables: { id: placeId, businessType: 'place' },
        query: `query getVisitorReviewStats($id: String, $itemId: String, $businessType: String = "place") { visitorReviewStats(input: {businessId: $id, itemId: $itemId, businessType: $businessType}) { analysis { votedKeyword { details { iconUrl displayName count __typename } __typename } __typename } __typename } }`,
      }),
    })
    if (!res.ok) return []
    const json = await res.json()
    const details = json?.data?.visitorReviewStats?.analysis?.votedKeyword?.details ?? []
    return details.slice(0, 3).map(d => ({
      displayName: d.displayName,
      iconUrl: d.iconUrl,
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 4: worker.test.js를 worker.js import 방식으로 수정**

`proxy/worker.test.js`의 인라인 `extractPlaceId` 정의를 worker.js import로 교체.
이를 위해 `worker.js`에서 `extractPlaceId`를 named export로 추가:

```js
// worker.js 하단에 추가
export { extractPlaceId }
```

그리고 `worker.test.js` 상단을 아래로 교체:

```js
import { describe, it, expect } from 'vitest'
import { extractPlaceId } from './worker.js'
```

- [ ] **Step 5: 테스트 실행 → PASS 확인**

```bash
npm run test:run -- worker
```

Expected: 4개 테스트 모두 PASS

- [ ] **Step 6: `handleSearch` keyword enrichment 적용**

기존 `handleSearch`의 네이버 응답 처리 부분을 교체한다.

`display` 처리: `naver.js`에서 `display=10`을 Worker에 전달하고, Worker는 이를 네이버에 그대로 전달한 뒤 `items.slice(0, 3)`으로 3개를 선택한 후 키워드 enrichment를 수행한다.

```js
async function handleSearch(request, env, origin, url) {
  const query = url.searchParams.get('query')
  const display = url.searchParams.get('display') || '5'
  const sort = url.searchParams.get('sort') || 'comment'
  const x = url.searchParams.get('x') || ''
  const y = url.searchParams.get('y') || ''

  if (!query) {
    return jsonResponse({ error: '검색어가 필요합니다.' }, 400, origin)
  }

  const naverParams = new URLSearchParams({ query, display, sort })
  if (x) naverParams.set('x', x)
  if (y) naverParams.set('y', y)

  try {
    const naverResponse = await fetch(
      `https://openapi.naver.com/v1/search/local.json?${naverParams}`,
      {
        headers: {
          'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET,
        },
      }
    )

    const data = await naverResponse.json()

    if (!data.items || data.items.length === 0) {
      return jsonResponse({ items: [] }, 200, origin)
    }

    // display로 넉넉히 받은 뒤 상위 3개 추출 후 keyword enrichment
    const items = data.items.slice(0, 3)

    const keywordsPerItem = await Promise.all(
      items.map(item => fetchPlaceKeywords(extractPlaceId(item.link)))
    )

    const enriched = items.map((item, i) => ({
      title: item.title,
      category: item.category || '',
      address: item.roadAddress || item.address || '',
      link: item.link || '',
      mapx: item.mapx,
      mapy: item.mapy,
      keywords: keywordsPerItem[i],
    }))

    return jsonResponse({ items: enriched }, 200, origin)
  } catch (err) {
    return jsonResponse({ error: '네이버 API 호출에 실패했습니다.' }, 500, origin)
  }
}
```

- [ ] **Step 7: Worker 로컬 통합 테스트**

```bash
cd /Users/haeunlee/Desktop/claude/02_맛집추천/proxy
wrangler dev
```

별도 터미널에서:

```bash
curl "http://localhost:8787/search?query=문정역+한식+맛집&display=10&sort=comment"
```

응답 items 각 항목에 `keywords` 배열 확인.
- keywords에 displayName, iconUrl 있으면 성공
- keywords가 빈 배열이면 Step 8 진행

- [ ] **Step 8: 인증 이슈 발생 시 진단 후 제거**

keywords가 빈 배열인 경우에만 `fetchPlaceKeywords` 내에 임시 디버그 로그를 추가해 상태 확인:

```js
// 임시 디버그 — 확인 후 반드시 삭제
const statusCode = res.status
const body = await res.text()
console.log('[debug] keyword status:', statusCode, body.slice(0, 200))
```

확인 후 **즉시 해당 로그 2줄 삭제**. 403이면 `Cookie` 헤더 추가 필요, 200인데 data null이면 GraphQL 쿼리 재확인.

- [ ] **Step 9: 디버그 로그 삭제 확인 + Commit**

```bash
# 디버그 로그가 없는지 확인
grep -n "debug\|console.log" proxy/worker.js
# → 결과 없어야 함

git add proxy/worker.js proxy/worker.test.js
git commit -m "Worker 방문자 키워드 enrichment 추가 — pcmap-api GraphQL 병렬 호출"
```

---

## Chunk 2: 클라이언트 — naver.js 업데이트 + 테스트

### Task 2: naver.js keywords 필드 반영 + 테스트 업데이트

**Files:**
- Modify: `src/services/naver.js`
- Modify: `src/test/naver.test.js`

- [ ] **Step 1: 기존 테스트 실행해 통과 확인**

```bash
cd /Users/haeunlee/Desktop/claude/02_맛집추천
npm run test:run -- naver
```

Expected: 5개 테스트 모두 PASS

- [ ] **Step 2: keywords 필드 기대하는 테스트 추가**

`src/test/naver.test.js`에 아래 두 테스트 추가:

```js
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

it('keywords 필드가 있으면 그대로 반환한다', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: mockItemsWithKeywords }),
  })
  const results = await searchRestaurants('국밥', 37.485, 127.122)
  expect(results[0].keywords).toEqual(mockItemsWithKeywords[0].keywords)
})

it('keywords 필드가 없으면 빈 배열을 반환한다', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: mockItems }),
  })
  const results = await searchRestaurants('국밥', 37.485, 127.122)
  expect(results[0].keywords).toEqual([])
})
```

- [ ] **Step 3: 테스트 실행 → FAIL 확인**

```bash
npm run test:run -- naver
```

Expected: 새로 추가한 2개 테스트 FAIL

- [ ] **Step 4: naver.js keywords 필드 반영**

`searchRestaurants` 함수의 map 부분에 `keywords` 추가:

```js
return data.items.slice(0, 3).map((item) => ({
  title: stripHtml(item.title),
  category: item.category || '',
  address: item.roadAddress || item.address || '',
  link: item.link || '',
  mapx: item.mapx,
  mapy: item.mapy,
  keywords: item.keywords ?? [],
}))
```

- [ ] **Step 5: 테스트 실행 → PASS 확인**

```bash
npm run test:run -- naver
```

Expected: 전체 7개 테스트 PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/naver.js src/test/naver.test.js
git commit -m "naver.js keywords 필드 추가 — 플레이스 방문자 키워드 표시 준비"
```

---

## Chunk 3: UI — RestaurantCard 키워드 배지

### Task 3: RestaurantCard에 키워드 배지 표시

**Files:**
- Modify: `src/components/RestaurantCard.jsx`
- Create: `src/test/RestaurantCard.test.jsx`

- [ ] **Step 1: RestaurantCard 테스트 작성**

`src/test/RestaurantCard.test.jsx` 생성:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RestaurantCard from '../components/RestaurantCard'

const base = { title: '맛집', address: '서울 송파구', link: '', mapx: '', mapy: '' }

describe('RestaurantCard', () => {
  it('keywords가 없으면 배지를 렌더링하지 않는다', () => {
    render(<RestaurantCard restaurant={{ ...base, keywords: [] }} index={0} />)
    expect(screen.queryByRole('img', { name: '' })).toBeNull()
  })

  it('keywords가 있으면 displayName을 렌더링한다', () => {
    const keywords = [
      { displayName: '음식이 맛있어요', iconUrl: 'https://ssl.pstatic.net/emoji1.png' },
      { displayName: '친절해요', iconUrl: 'https://ssl.pstatic.net/emoji2.png' },
    ]
    render(<RestaurantCard restaurant={{ ...base, keywords }} index={0} />)
    expect(screen.getByText('음식이 맛있어요')).toBeInTheDocument()
    expect(screen.getByText('친절해요')).toBeInTheDocument()
  })

  it('keywords prop이 없어도 정상 렌더링된다', () => {
    render(<RestaurantCard restaurant={base} index={0} />)
    expect(screen.getByText('맛집')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
npm run test:run -- RestaurantCard
```

Expected: FAIL

- [ ] **Step 3: RestaurantCard keywords 배지 구현**

`src/components/RestaurantCard.jsx` 전체를 아래로 교체:

```jsx
/**
 * 역할: 맛집 카드 컴포넌트
 * 주요 기능: 업체명/주소/방문자 키워드 배지 표시
 * 참고: 링크는 네이버 플레이스 검색 결과로 이동 (가게명 검색)
 */
export default function RestaurantCard({ restaurant, index }) {
  const { title, address, keywords = [] } = restaurant

  // 네이버 플레이스 검색 결과로 이동
  const naverPlaceUrl = `https://map.naver.com/v5/search/${encodeURIComponent(title)}`

  return (
    <a
      href={naverPlaceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white p-4 transition-all"
      style={{ borderRadius: '20px', border: '1.5px solid transparent' }}
      onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #1F2327'}
      onMouseLeave={e => e.currentTarget.style.border = '1.5px solid transparent'}
    >
      <div className="flex items-center gap-3">
        <img
          src={`/${index + 1}.svg`}
          alt={`${index + 1}`}
          className="shrink-0 h-5 w-5"
        />

        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-xl"
            style={{ fontFamily: 'MemomentKkukkukk, sans-serif', color: '#1F2327' }}
          >
            {title}
          </h3>
          {address && (
            <p
              className="mt-0.5 truncate text-sm"
              style={{ fontFamily: 'Pretendard, sans-serif', color: '#999999' }}
            >
              {address}
            </p>
          )}
          {/* 방문자 키워드 배지 — keywords가 있을 때만 표시 */}
          {keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw.displayName}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: '#F5F5F5',
                    color: '#555555',
                    fontFamily: 'Pretendard, sans-serif',
                  }}
                >
                  <img src={kw.iconUrl} alt="" className="h-3.5 w-3.5" />
                  {kw.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        <img src="/arrow.svg" alt="더보기" className="shrink-0 h-4 w-4 self-start mt-1" />
      </div>
    </a>
  )
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
npm run test:run -- RestaurantCard
```

Expected: 3개 테스트 모두 PASS

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
npm run test:run
```

Expected: 전체 테스트 PASS

- [ ] **Step 6: 개발 서버에서 시각 확인**

```bash
npm run dev
```

브라우저에서 검색 후 결과 화면 확인:
- keywords 있는 카드: 주소 아래 이모지 + 텍스트 배지 최대 3개
- keywords 없는 카드: 배지 없이 정상 표시

- [ ] **Step 7: Commit**

```bash
git add src/components/RestaurantCard.jsx src/test/RestaurantCard.test.jsx
git commit -m "RestaurantCard 방문자 키워드 배지 추가 — 주소 아래 상위 3개 표시"
```

---

## 완료 기준

- [ ] 맛집 카드 주소 아래에 키워드 배지 최대 3개 표시
- [ ] keywords 없는 카드는 배지 없이 정상 렌더링
- [ ] 전체 테스트 통과 (`npm run test:run`)
- [ ] Worker GraphQL 호출 실패해도 검색 결과는 정상 표시
- [ ] 프로덕션 코드에 디버그 로그 없음
