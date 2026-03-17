/**
 * 역할: Step 2 — 결과 화면 (1단 레이아웃: 플립 카드 + 맛집 리스트)
 * 주요 기능: 3D 플립 카드 상단 배치, 맛집 카드 리스트 하단 1단 나열
 */
import { useState, useEffect } from 'react'
import FlipCard from './FlipCard'
import RestaurantCard from './RestaurantCard'
import ErrorMessage from './ErrorMessage'
import { MENU_IMAGE_MAP } from '../data/keywords'
import { EMOTIONS } from '../data/emotions'

export default function ResultScreen({
  emotion,
  keyword,
  foodHint,
  restaurants,
  isFallback,
  analysisFailed,
  restaurantError,
  onReset,
}) {
  const [showRestaurants, setShowRestaurants] = useState(false)

  useEffect(() => {
    setShowRestaurants(false)
    // 0.8초 뒤에 타이틀과 리스트가 동시에 나타나도록 설정 (카드 낙하 애니메이션과 조화)
    const timer = setTimeout(() => setShowRestaurants(true), 800)
    return () => clearTimeout(timer)
  }, [emotion])

  const emotionImage = emotion ? `/images/${emotion}.jpg` : null
  // 카테고리 이미지 — 영문 파일명 매핑 사용 (한글 파일명 NFC/NFD 인코딩 문제 방지)
  const imageKey = foodHint || keyword || ''
  const imageFile = MENU_IMAGE_MAP[imageKey] || 'common'
  const categoryImage = `/images/category/${imageFile}.png`

  // 맛집 개수에 따른 동적 타이틀 함수
  const getTitle = () => {
    const count = restaurants.length
    if (count === 0) return '결과를 못 찾았어요 🥲'
    if (count === 1) return '찾았다! 오늘의 원픽 ✨'
    if (count === 2) return '취향저격 BEST 2 ✨'
    return `믿고 가는 BEST ${count} 🏆`
  }

  return (
    <div className="h-dvh md:h-dvh bg-black overflow-y-auto md:overflow-hidden select-none">
      {/* 데스크탑은 h-dvh/overflow-hidden으로 중앙 고정, 모바일은 자유로운 스크롤 허용 */}
      <div className="min-h-full md:h-full mx-auto max-w-5xl px-6 py-12 md:py-0 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

          {/* 좌측 — 플립 카드 (모바일에서 하단 여백 확보를 위해 mb-8 추가) */}
          <div className="flex justify-center mb-8 md:mb-0">
            <FlipCard
              keyword={keyword}
              categoryImage={categoryImage}
              emotionImage={emotionImage}
              emotionKey={emotion}
            />
          </div>

          {/* 우측 — 맛집 섹션 (모바일에서 max-h 제거하여 전체 스크롤 활용) */}
          <div className="flex flex-col items-start md:max-h-[85vh] px-4">
            {/* 헤더 섹션 (타이틀 + 다시 추천받기 버튼) — 리스트와 동시 노출 */}
            <div
              className={`w-full flex justify-between items-baseline mb-4 transition-all duration-700 ease-out ${showRestaurants ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <p
                className="text-3xl md:text-4xl text-left"
                style={{
                  fontFamily: 'MemomentKkukkukk, sans-serif',
                  color: '#FAFAF2'
                }}
              >
                {getTitle()}
              </p>

              {/* 다시 추천받기 텍스트 버튼 (타이틀 우측 끝 배치) */}
              <button
                onClick={onReset}
                className="group relative inline-flex items-center gap-1.5 transition-all duration-300 active:scale-[0.98] whitespace-nowrap ml-4"
                style={{
                  fontFamily: 'MemomentKkukkukk, sans-serif',
                  fontSize: '15px',
                  color: '#FAFAF2',
                  backgroundColor: 'transparent',
                  padding: '2px 0'
                }}
              >
                <span className="relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                  다시 추천받기
                </span>
                {/* 리프레시 아이콘 */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500 ease-in-out"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <div className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#FAFAF2] opacity-40 transition-all duration-300 group-hover:w-full" />
              </button>
            </div>

            {/* 맛집 리스트 (타이틀과 동시에 등장) */}
            <div
              className={`flex-1 min-h-0 w-full transition-all duration-700 ease-out overflow-y-auto pb-2 custom-scrollbar ${showRestaurants ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {restaurantError ? (
                <ErrorMessage message={restaurantError} />
              ) : restaurants.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {restaurants.map((r, i) => (
                    <RestaurantCard key={r.title} restaurant={r} index={i} isTop={i === 0} />
                  ))}
                </div>
              ) : (
                <p
                  className="text-left text-sm py-10"
                  style={{ fontFamily: 'Pretendard, sans-serif', color: '#999999' }}
                >
                  조건에 맞는 맛집을 못 찾았어요 🥲
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
