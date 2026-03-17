/**
 * 역할: 3D 플립 카드 — 앞면(카테고리 이미지+메뉴명+추천이유) / 뒷면(감정 이미지)
 * 주요 기능: GSAP 입장 애니메이션, 플로팅, hover Y축 플립 (1.5s 후 자동 복귀), 바닥 반사
 * 참고: https://www.eduardbodak.com/preis 기반
 */
import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

/** 픽셀 도트 코너 브래킷 (네 모서리가 깎인 사각형 형태) */
const CornerBracket = ({ style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 3 3"
    width="9"
    height="9"
    style={{ position: 'absolute', margin: '14px', ...style }}
    aria-hidden="true"
  >
    {/* 3x3 그리드에서 4모서리가 비어있는 형태 (십자가 두께 느낌) */}
    <path d="M1 0h1v1H1z" />
    <path d="M0 1h3v1H0z" />
    <path d="M1 2h1v1H1z" />
  </svg>
)

/** 지글지글한 핸드드로잉 효과를 위한 SVG 필터 정의 (감도 조정) */
const HandDrawnFilter = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <filter id="wiggleFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="1" />
      <feDisplacementMap in="SourceGraphic" scale="2" />
    </filter>
  </svg>
)

/** 카드 앞면 콘텐츠 — 박스리스 및 타이틀 상단 배치 (116차) */
function CardFrontContent({ keyword, categoryImage }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#FCDCA6', // 요청 컬러
      border: '2px solid #1F2327',
      borderRadius: '12px',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0' // 가로선 테두리 연결을 위해 좌우 패딩 제거
    }}>
      {/* 1. 상단 라벨 (TODAY'S MEAL) */}
      <div style={{
        textAlign: 'center',
        marginBottom: '10px',
        padding: '0 12px'
      }}>
        <p style={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '11px',
          fontWeight: '900',
          letterSpacing: '0.15em',
          color: '#1F2327',
          margin: 0,
          textTransform: 'uppercase'
        }}>
          TODAY'S MEAL
        </p>
      </div>

      {/* 2. 중앙 그래픽 영역 (완전 박스리스) */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px'
      }}>
        <img
          src={categoryImage || '/images/category/공통.png'}
          alt={keyword}
          style={{
            maxHeight: '180px',
            objectFit: 'contain'
          }}
          onError={e => { e.currentTarget.src = '/images/category/common.png' }}
        />
      </div>

      {/* 3. 하단 텍스트 슬롯 (메뉴명 하단 배치) */}
      <div style={{
        marginTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* 가로선을 양끝 테두리와 연결 (H-Frame) */}
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: '#1F2327',
          marginBottom: '14px'
        }} />

        <div style={{ padding: '0 12px', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
          <h2 style={{
            fontFamily: 'MemomentKkukkukk, sans-serif',
            fontSize: '32px',
            color: '#1F2327',
            margin: 0,
            lineHeight: 1,
            textAlign: 'center'
          }}>
            {keyword}
          </h2>
        </div>
      </div>
    </div>
  )
}

const CARD_W = 260
const CARD_H = 358
const MIRROR_H = Math.round(CARD_H * 0.38)

export default function FlipCard({ keyword, categoryImage, emotionImage, emotionKey }) {
  const [isMobile, setIsMobile] = useState(false)
  const wrapperRef = useRef(null)    // 전체 — 입장/플로팅 y 이동
  const autoFlipTimerRef = useRef(null)
  const floatingTweenRef = useRef(null)

  // 모바일 여부 체크 (768px 미만)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 모바일에 따라 가변적인 크기 설정
  const scale = isMobile ? 0.82 : 1
  const w = CARD_W * scale
  const h = CARD_H * scale
  const mirrorGap = isMobile ? 25 : 40 // 반사 효과와 카드 사이의 수직 간격

  // GSAP 행렬 계산 오류를 피하기 위해, 직접적인 CSS transform 상태로 뒤집기를 제어합니다.
  const [isFlipped, setIsFlipped] = useState(false)
  const isEntranceDone = useRef(false) // 입장 애니메이션 완료 여부

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function startFloating() {
      if (prefersReducedMotion) return
      floatingTweenRef.current = gsap.fromTo(
        wrapperRef.current,
        { yPercent: -2 },
        {
          yPercent: 2,
          duration: () => gsap.utils.random(1.5, 2.5),
          ease: 'sine.inOut',
          repeat: -1,
          repeatRefresh: true,
          yoyo: true,
        }
      )
    }

    if (prefersReducedMotion) {
      isEntranceDone.current = true
      startFloating()
    } else {
      // 입장 애니메이션 (y축 떨어지는 효과만 gsap로 제어)
      gsap.fromTo(wrapperRef.current, { y: '-4em' }, {
        y: 0,
        duration: 1,
        ease: 'elastic.out(1, 0.75)',
        onComplete: () => {
          isEntranceDone.current = true
          startFloating()
        }
      })
    }

    return () => {
      gsap.killTweensOf(wrapperRef.current)
      if (autoFlipTimerRef.current) clearTimeout(autoFlipTimerRef.current)
    }
  }, [])

  const handleMouseEnter = () => {
    if (!isEntranceDone.current || isFlipped) return
    setIsFlipped(true)
    floatingTweenRef.current?.pause()

    if (autoFlipTimerRef.current) clearTimeout(autoFlipTimerRef.current)
    autoFlipTimerRef.current = setTimeout(() => {
      setIsFlipped(false)
      floatingTweenRef.current?.resume()
    }, 1500)
  }

  const handleMouseLeave = () => {
    // 마우스가 떠나도 상태 유지. 1.5초 뒤 타이머가 스스로 원복시킴.
  }

  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '12px', // 곡률 원복
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <HandDrawnFilter />

      {/* 카드 씬 — perspective 설정, mouseenter/leave 이벤트 */}
      <div
        data-testid="card-scene"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: '150svh',
          perspectiveOrigin: '50% 0',
          width: w,
          height: h,
        }}
      >
        {/* 실제 카드 본체 */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0, left: 0,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
            // GSAP 대신 CSS 순수 transform 상태 할당
            transform: isFlipped ? 'rotateZ(6deg) rotateY(180deg)' : 'rotateZ(6deg) rotateY(0deg)',
          }}
        >
          {/* 앞면 - 뒷면과 동일한 외곽 띠 구조 적용 */}
          <div style={{
            ...faceStyle,
            backgroundColor: '#FAFAF2', // 시그니처 아이보리 외곽 띠
            border: '2.5px solid #1F2327',
            padding: '10px'
          }}>
            <CardFrontContent keyword={keyword} categoryImage={categoryImage} />
          </div>

          {/* 뒷면 - 오렌지 컬렉션 스타일 적용 */}
          <div style={{
            ...faceStyle,
            backgroundColor: '#FAFAF2',
            border: '2.5px solid #1F2327',
            transform: 'rotateY(180deg)',
            padding: '10px'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#FCDCA6', // 요청 컬러
              border: '2px solid #1F2327',
              borderRadius: '12px', // 앞면과 동일한 곡률
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                flex: 1,
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                border: '2px solid #1F2327'
              }}>
                {emotionImage && (
                  <img
                    src={emotionImage}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                )}
              </div>
              <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: '12px',
                  fontWeight: '900',
                  letterSpacing: '0.12em',
                  color: '#1F2327', // 대비를 위해 어두운 색상
                  margin: 0,
                  textTransform: 'uppercase'
                }}>
                  THE {(emotionKey || 'TODAY').toUpperCase()} MOMENT
                </p>
              </div>
            </div>
          </div>
        </div>

        {/*
          반사 영역 (거울 효과) — 레퍼런스 사이트와 정확하게 동일한 형제 요소 구조 및 CSS Transition
        */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transformOrigin: '50% 50%',
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
            // opacity/filter를 부모에 놓으면 웹킷 브라우저에서 preserve-3d가 깨지는 현상(Flattening) 발생
            transition: 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
            // 모바일일 때 간격을 좁혀서 요소 겹침 방지
            transform: isFlipped
              ? `translate(0%, 100%) translate3d(0px, ${mirrorGap}px, 0px) rotateZ(-6deg) scale(-1, -1) rotateY(-180deg)`
              : `translate(0%, 100%) translate3d(0px, ${mirrorGap}px, 0px) rotateZ(-6deg) scale(-1, -1) rotateY(0deg)`,
          }}
        >
          {/* 반사 앞면 */}
          <div style={{
            ...faceStyle,
            backgroundColor: '#FAFAF2',
            border: '2px solid #1F2327',
            opacity: 0.35,
            filter: 'blur(5px)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 45%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 45%)',
          }}>
            <CardFrontContent keyword={keyword} categoryImage={categoryImage} />
          </div>

          {/* 반사 뒷면 */}
          <div style={{
            ...faceStyle,
            backgroundColor: '#FAFAF2',
            transform: 'rotateY(180deg)',
            padding: '12px',
            opacity: 0.15,
            filter: 'blur(4px)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%)',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              border: '1px solid rgba(31, 35, 39, 0.2)',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {emotionImage && (
                <img src={emotionImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
