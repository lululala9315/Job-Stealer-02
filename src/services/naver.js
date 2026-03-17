/**
 * 역할: 네이버 지역 검색 API 호출 (Cloudflare Workers 프록시 경유)
 * 주요 기능: 키워드+좌표 기반 맛집 검색, 리뷰수 정렬, HTML 태그 제거
 * 의존성: 환경변수 VITE_NAVER_PROXY_URL
 */

/** 검색 지역명 — ResultScreen UI 텍스트와 동기화 */
export const SEARCH_LOCATION = '문정역'

/** 문정역 중심 좌표 — 위치 검색 고정점 */
const MUNJEONG_LNG = '127.1232'
const MUNJEONG_LAT = '37.4851'

/** HTML 태그 제거 — 네이버 응답의 <b> 태그 등 정리 */
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '')
}

/** 분석 실패 시 fallback — 문정동 리뷰수 1위 맛집 1개 반환 */
export async function searchTopRestaurant() {
  const results = await searchRestaurants('맛집')
  return results.slice(0, 1)
}

/** 메뉴 키워드 순서대로 검증 — 결과 2개 미만이면 다음 키워드로 재시도
 *  shuffle: true면 매번 다른 메뉴(감정 기반 키워드용), false면 가장 구체적인 키워드 우선(foodHint용)
 *  모든 키워드 실패 시 '문정역 맛집' fallback
 */
export async function searchWithVerification(menuKeywords, { shuffle = true } = {}) {
  const ordered = shuffle ? [...menuKeywords].sort(() => Math.random() - 0.5) : menuKeywords
  for (const keyword of ordered) {
    const results = await searchRestaurants(keyword)
    if (results.length >= 2) {
      return { keyword, results, isFallback: false }
    }
  }
  // 모든 후보 실패 — 문정역 맛집 전체로 fallback (관련성 필터 없이)
  const fallbackResults = await searchRestaurants('맛집', { menuKeyword: '' })
  return {
    keyword: '문정역 맛집',
    results: fallbackResults,
    isFallback: true,
  }
}

/** 네이버 지역 검색 → 상위 3개 맛집 반환
 *  menuKeyword 생략 시 관련성 필터 없이 전체 반환 (fallback 검색용)
 */
export async function searchRestaurants(keyword, { menuKeyword = keyword } = {}) {
  const proxyUrl = import.meta.env.VITE_NAVER_PROXY_URL
  if (!proxyUrl) {
    throw new Error('네이버 프록시 URL이 설정되지 않았습니다.')
  }

  const params = new URLSearchParams({
    query: `문정동 ${keyword}`,
    menuKeyword, // 빈 문자열이면 worker에서 필터 미적용
    display: '20',
    sort: 'comment',
    x: MUNJEONG_LNG,
    y: MUNJEONG_LAT,
  })

  const response = await fetch(`${proxyUrl}/search?${params}`)

  if (!response.ok) {
    throw new Error('맛집 검색에 실패했습니다.')
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return []
  }

  return data.items.slice(0, 3).map((item) => ({
    title: stripHtml(item.title),
    category: item.category || '',
    address: item.roadAddress || item.address || '',
    link: item.link || '',
    // 네이버 지역검색 API는 mapx, mapy 좌표 제공
    mapx: item.mapx,
    mapy: item.mapy,
    keywords: item.keywords ?? [],
    placeId: item.placeId ?? null, // Worker에서 HTML 파싱으로 추출한 네이버 플레이스 ID
  }))
}
