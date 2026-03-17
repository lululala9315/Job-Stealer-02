/**
 * 역할: Cloudflare Workers 프록시 — 네이버 지역 검색 CORS 해결
 * 주요 기능: 클라이언트 → Worker → 네이버 API 중계 (API 키 서버사이드 보호)
 * 참고: wrangler.toml에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 설정 필요
 */

/** link URL에서 네이버 플레이스 ID 추출 — map.naver.com/v5/entry/place/{id} 형식 */
export function extractPlaceId(link) {
  const match = link?.match(/place\/(\d+)/)
  return match?.[1] ?? null
}

/** Naver 검색 HTML에서 votedKeyword + placeId 파싱
 *  검색 목록 페이지엔 votedKeyword 없음 — 단일 가게 상세가 상단에 떠야 추출 가능
 */
function parseNaverHtml(html) {
  const placeIdMatch = html.match(/entry\/place\/(\d+)/)
  const placeId = placeIdMatch?.[1] ?? null

  const marker = '"votedKeyword":'
  const markerIdx = html.indexOf(marker)
  if (markerIdx === -1) return { keywords: [], placeId }

  let depth = 0, pos = markerIdx + marker.length
  while (pos < html.length) {
    if (html[pos] === '{') depth++
    else if (html[pos] === '}' && --depth === 0) { pos++; break }
    pos++
  }

  try {
    const votedKeyword = JSON.parse(html.slice(markerIdx + marker.length, pos))
    const details = votedKeyword.details ?? []
    const keywords = details.slice(0, 3).map(d => ({
      displayName: d.displayName,
      iconUrl: d.iconUrl,
    }))
    return { keywords, placeId }
  } catch {
    return { keywords: [], placeId }
  }
}

/** Naver 검색 HTML에서 방문자 키워드 + placeId 추출
 *  동 → 구 → 업체명 단독 순으로 재시도 — 구체적일수록 단일 상세 페이지 히트율 높음
 *  실패 시 keywords:[], placeId:null 반환
 */
async function getKeywordsForItem(item) {
  const cleanTitle = item.title.replace(/<[^>]*>/g, '')
  const address = item.roadAddress || item.address || ''

  const dongMatch = address.match(/([가-힣]+동)/)
  const guMatch = address.match(/([가-힣]+구)/)

  // 동 → 구 → 업체명 단독 순으로 시도
  const queries = [
    dongMatch ? `${cleanTitle} ${dongMatch[1]}` : null,
    guMatch ? `${cleanTitle} ${guMatch[1]}` : null,
    cleanTitle,
  ].filter(Boolean)

  let bestPlaceId = null

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://search.naver.com/search.naver?${new URLSearchParams({ query, where: 'nexearch' })}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9',
          },
        }
      )
      const html = await res.text()
      const result = parseNaverHtml(html)

      // placeId는 처음 발견된 것 저장 (이후 쿼리에서도 못 찾을 수 있으므로)
      if (result.placeId && !bestPlaceId) bestPlaceId = result.placeId

      // keywords 있으면 즉시 반환 — 없으면 다음 쿼리로 재시도
      if (result.keywords.length > 0) return { keywords: result.keywords, placeId: result.placeId ?? bestPlaceId }
    } catch {
      // 네트워크 오류 시 다음 쿼리 시도
    }
  }

  return { keywords: [], placeId: bestPlaceId }
}

// 내부 공유용 — 전체 origin 허용
function isAllowedOrigin(origin) {
  return true
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
      })
    }

    if (url.pathname === '/search') {
      return handleSearch(request, env, origin, url)
    }

    return new Response('Not Found', { status: 404 })
  },
}

/** 메뉴 키워드 관련성 점수 계산
 *  2점: 업체명에 키워드 포함 (전문점)
 *  1점: 카테고리에 키워드 포함 (관련 업종)
 *  0점: 해당 없음
 */
export function scoreRelevance(item, menuKeyword) {
  if (!menuKeyword) return 0
  const keyword = menuKeyword.replace(/\s/g, '').toLowerCase()
  const title = item.title.replace(/<[^>]*>/g, '').replace(/\s/g, '').toLowerCase()
  const category = (item.category || '').replace(/\s/g, '').toLowerCase()
  if (title.includes(keyword)) return 2
  if (category.includes(keyword)) return 1
  return 0
}

/** 네이버 지역 검색 처리 + 관련성 필터링 + 방문자 키워드 enrichment */
async function handleSearch(request, env, origin, url) {
  const query = url.searchParams.get('query')
  const menuKeyword = url.searchParams.get('menuKeyword') || ''
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

    // 관련성 점수 부여 후 내림차순 정렬 (동점 내에서는 리뷰수 순서 유지)
    const scored = data.items.map((item, idx) => ({
      item,
      score: scoreRelevance(item, menuKeyword),
      idx, // 원래 순서 (리뷰수 순) 보존용
    }))
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx)

    // 문정동/문정로 우선 → 문정 포함 주소로 단계적 축소
    // 도로명(roadAddress)과 지번(address) 둘 다 체크 — 문정동은 지번에만 나오는 경우가 많음
    const hasMunjeong = (item, keyword) => {
      const road = item.roadAddress || ''
      const addr = item.address || ''
      return road.includes(keyword) || addr.includes(keyword)
    }
    // 스타벅스 등 프랜차이즈 체인 제외
    const EXCLUDED_CHAINS = ['스타벅스']
    const isExcluded = (item) => EXCLUDED_CHAINS.some(chain => item.title.replace(/<[^>]*>/g, '').includes(chain))

    const byDong = scored.filter(s => (hasMunjeong(s.item, '문정동') || hasMunjeong(s.item, '문정로')) && !isExcluded(s.item))
    const candidates = byDong.length > 0
      ? byDong
      : scored.filter(s => hasMunjeong(s.item, '문정') && !isExcluded(s.item))

    if (candidates.length === 0) {
      return jsonResponse({ items: [] }, 200, origin)
    }

    // menuKeyword 있을 때 score > 0만 반환 — 개수는 있는 만큼 (2개면 2개)
    // score > 0이 없으면 빈 결과 → 클라이언트가 다음 키워드 재시도
    const pool = menuKeyword ? candidates.filter(s => s.score > 0) : candidates
    if (pool.length === 0) {
      return jsonResponse({ items: [] }, 200, origin)
    }

    const top3 = pool.slice(0, 3).map(s => s.item)

    const enrichDataPerItem = await Promise.all(
      top3.map(item => getKeywordsForItem(item))
    )

    const enriched = top3.map((item, i) => ({
      title: item.title,
      category: item.category || '',
      address: item.roadAddress || item.address || '',
      link: item.link || '',
      mapx: item.mapx,
      mapy: item.mapy,
      keywords: enrichDataPerItem[i].keywords,
      placeId: enrichDataPerItem[i].placeId,
    }))

    return jsonResponse({ items: enriched }, 200, origin)
  } catch (err) {
    return jsonResponse({ error: '네이버 API 호출에 실패했습니다.' }, 500, origin)
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  })
}
