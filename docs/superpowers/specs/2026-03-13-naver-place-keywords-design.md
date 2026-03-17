# 네이버 플레이스 방문자 키워드 통계 표시

**날짜**: 2026-03-13
**상태**: 승인됨

## 목표

맛집 카드 주소 아래에 네이버 플레이스 "이런 점이 좋았어요" 상위 3개 키워드를 이모지 + 텍스트 배지로 표시한다.

## 데이터 소스

- **엔드포인트**: `https://pcmap-api.place.naver.com/graphql`
- **Operation**: `getVisitorReviewStats`
- **변수**: `{ id: "{placeId}", businessType: "place" }`
- **응답 경로**: `data.visitorReviewStats.analysis.votedKeyword.details` (count 내림차순 정렬됨)
- **필요 필드**: `displayName`, `iconUrl`

### GraphQL 쿼리

```graphql
query getVisitorReviewStats($id: String, $itemId: String, $businessType: String = "place") {
  visitorReviewStats(
    input: {businessId: $id, itemId: $itemId, businessType: $businessType}
  ) {
    analysis {
      votedKeyword {
        details {
          iconUrl
          displayName
          count
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
```

## placeId 추출

네이버 local.json 응답의 `link` 필드에서 정규식으로 추출:

```js
const match = item.link?.match(/place\/(\d+)/)
const placeId = match?.[1] ?? null
```

## 아키텍처

### 데이터 흐름

```
Client
  → Worker /search
      → 네이버 local.json API
      → 각 업체 link에서 placeId 추출
      → pcmap-api.place.naver.com/graphql × N (병렬, Promise.all)
  ← keywords 포함된 enriched 맛집 데이터 반환
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `proxy/worker.js` | `handleSearch`에서 local.json 응답 후 각 업체 GraphQL 병렬 호출, keywords 필드 추가 |
| `src/services/naver.js` | 반환 데이터에 `keywords` 필드 추가 |
| `src/components/RestaurantCard.jsx` | `keywords` prop 받아 주소 아래 배지 표시 |

### 반환 데이터 구조

```js
{
  title: "섬맛의공방제주이야기 파크하비오점",
  category: "한식",
  address: "서울시 ...",
  link: "https://map.naver.com/...",
  mapx: "...",
  mapy: "...",
  keywords: [
    { displayName: "음식이 맛있어요", iconUrl: "https://ssl.pstatic.net/..." },
    { displayName: "고기 질이 좋아요", iconUrl: "https://ssl.pstatic.net/..." },
    { displayName: "매장이 넓어요",   iconUrl: "https://ssl.pstatic.net/..." },
  ]
}
```

### UI 위치

RestaurantCard 내 주소 텍스트 바로 아래. 이모지 이미지 + 텍스트 chip 형태. keywords가 없으면 미표시.

## 에러 처리 / Fallback

- placeId 추출 실패 → `keywords: []`
- GraphQL 요청 실패 (네트워크, 인증 등) → `keywords: []`
- 빈 details 배열 → `keywords: []`
- 카드는 항상 표시, keywords만 조건부 렌더링

## 리스크

- GraphQL 엔드포인트가 로그인 쿠키를 요구할 수 있음 → `Referer: https://map.naver.com` 헤더 추가로 우회 시도
- 비공개 내부 API라 구조 변경 가능성 있음 (내부 공유용 프로젝트이므로 허용 범위)
