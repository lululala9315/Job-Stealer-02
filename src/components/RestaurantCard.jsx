/**
 * 역할: 맛집 카드 컴포넌트
 * 주요 기능: 업체명/주소/방문자 키워드 배지 표시, 1위 카드 강조 (isTop)
 * 참고: placeId 있으면 상세 페이지 직접 링크, 없으면 검색 결과 fallback
 */
export default function RestaurantCard({ restaurant, index, isTop = false }) {
  const { title, address, keywords = [], placeId } = restaurant

  // placeId 있으면 가게 상세 페이지 직접 링크, 없으면 검색 결과 fallback
  const naverPlaceUrl = placeId
    ? `https://map.naver.com/p/entry/place/${placeId}`
    : `https://map.naver.com/v5/search/${encodeURIComponent(title + ' 문정역')}`

  // 네이버 keywords 없으면 기본 뱃지로 fallback — 뱃지 항상 노출
  const fallbackKeywords = [
    { displayName: '음식이 맛있어요', iconUrl: null },
    { displayName: '재료가 신선해요', iconUrl: null },
    { displayName: '친절해요', iconUrl: null },
  ]
  const displayKeywords = keywords.length > 0 ? keywords : fallbackKeywords

  // 순위별 배지 컬러 설정 (골드, 실버, 브론즈 계열)
  const getBadgeColors = (idx) => {
    if (idx === 0) return { bg: "#FFD700", text: "#BF8F00", leaf: "#FFD700" }
    if (idx === 1) return { bg: "#C0C0C0", text: "#999999", leaf: "#C0C0C0" }
    if (idx === 2) return { bg: "#CD7F32", text: "#B87333", leaf: "#CD7F32" }
    return { bg: "#DDDDDD", text: "#1F2327", leaf: "#DDDDDD" }
  }
  const badgeColors = getBadgeColors(index)

  return (
    <a
      href={naverPlaceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transition-all duration-300 active:scale-[0.95] hover:scale-[1.02] hover:z-10 relative card-entrance"
      style={{
        backgroundColor: 'transparent',
        marginBottom: '2px'
      }}
    >
      {/* 핸드드로잉 SVG 배경 및 보더 */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 400 120"
      >
        <path
          d="M 25,5 Q 200,2 375,5 Q 397,5 397,60 Q 397,115 375,115 Q 200,118 25,115 Q 3,115 3,60 Q 3,5 25,5"
          fill="#FAFAF2"
          stroke="#1F2327"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300 group-hover:stroke-width-[3px]"
        />
      </svg>

      <div className="relative z-10 flex items-center gap-4 p-6">
        {/* 순위 표시 - 더욱 콤팩트해진 월계수 배지 (w/h 14->11로 추가 축소) */}
        <div className="shrink-0 relative flex items-center justify-center w-11 h-11">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <path id="laurel-leaf" d="M 0,0 C -4,-2 -6,-8 0,-12 C 6,-8 4,-2 0,0 Z" />
            </defs>
            <g fill={badgeColors.leaf}>
              {/* 왼쪽 잎사귀 */}
              <use href="#laurel-leaf" x="35" y="77" transform="rotate(-100 35 77)" />
              <use href="#laurel-leaf" x="25" y="65" transform="rotate(-120 25 65)" />
              <use href="#laurel-leaf" x="20" y="50" transform="rotate(-140 20 50)" />
              <use href="#laurel-leaf" x="22" y="35" transform="rotate(-160 22 35)" />
              <use href="#laurel-leaf" x="30" y="23" transform="rotate(-180 30 23)" />

              {/* 오른쪽 잎사귀 */}
              <use href="#laurel-leaf" x="65" y="77" transform="rotate(100 65 77)" />
              <use href="#laurel-leaf" x="75" y="65" transform="rotate(120 75 65)" />
              <use href="#laurel-leaf" x="80" y="50" transform="rotate(140 80 50)" />
              <use href="#laurel-leaf" x="78" y="35" transform="rotate(160 78 35)" />
              <use href="#laurel-leaf" x="70" y="23" transform="rotate(180 70 23)" />
            </g>
          </svg>

          <span
            className="relative z-10 font-black"
            style={{
              fontFamily: 'MemomentKkukkukk, sans-serif',
              fontSize: index === 0 ? '18px' : '15px', // 숫자 크기 추가 축소
              color: badgeColors.text,
              lineHeight: 1,
              marginTop: '3px'
            }}
          >
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="truncate"
            style={{
              fontFamily: 'MemomentKkukkukk, sans-serif',
              color: '#1F2327',
              fontSize: '18px',
              marginBottom: '3px'
            }}
          >
            {title}
          </h3>
          {address && (
            <p
              className="mt-1 truncate text-[11px]"
              style={{ fontFamily: 'Pretendard, sans-serif', color: '#888888' }}
            >
              {address}
            </p>
          )}
          {displayKeywords.length > 0 && (
            <div className="mt-2 flex flex-nowrap gap-1.5 overflow-hidden">
              {displayKeywords.slice(0, 3).map((kw) => (
                <span
                  key={kw.displayName}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(234, 234, 224, 0.4)',
                    color: '#666666',
                    border: '1px solid rgba(31, 35, 39, 0.03)',
                    fontFamily: 'Pretendard, sans-serif'
                  }}
                >
                  {kw.iconUrl && <img src={kw.iconUrl} alt="" className="h-2.5 w-2.5 opacity-60" />}
                  {kw.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 ml-2">
          <img src="/arrow.svg" alt="더보기" className="h-4 w-4 brightness-0" />
        </div>
      </div>
    </a>
  )
}
